#!/usr/bin/env bash
set -euo pipefail
source infra/aws-ids.env
source infra/aws-helpers.sh

KEY_FILE="infra/${KEY_NAME}.pem"

echo "== EC2 Provisioning =="

# 1) Key pair
if aws ec2 describe-key-pairs --key-names $KEY_NAME --region $REGION >/dev/null 2>&1; then
  echo ">> Reusing key pair $KEY_NAME"
  if [ ! -f "$KEY_FILE" ]; then
    echo "   WARNING: key file $KEY_FILE missing locally — you won't be able to SSH unless you have it from previous creation."
    echo "   Consider deleting key pair and recreating:"
    echo "   aws ec2 delete-key-pair --key-name $KEY_NAME --region $REGION"
  fi
else
  echo ">> Creating key pair $KEY_NAME -> $KEY_FILE"
  aws ec2 create-key-pair --key-name $KEY_NAME --key-type rsa --key-format pem --region $REGION --query "KeyMaterial" --output text > "$KEY_FILE"
  chmod 400 "$KEY_FILE"
  echo "   Saved to $KEY_FILE"
fi

# 2) Check existing instance (running)
EXISTING_ID=$(aws ec2 describe-instances --filters Name=tag:Name,Values=${TAG_PREFIX}-app --region $REGION --query "Reservations[].Instances[?State.Name!='terminated'].InstanceId" --output text 2>/dev/null | tr '\t' '\n' | head -1 | tr -d '[:space:]' || echo "")
if [ -n "$EXISTING_ID" ] && [ "$EXISTING_ID" != "None" ] && [ "$EXISTING_ID" != "" ]; then
  STATE=$(aws ec2 describe-instances --instance-ids $EXISTING_ID --region $REGION --query "Reservations[0].Instances[0].State.Name" --output text)
  if [ "$STATE" == "running" ] || [ "$STATE" == "pending" ]; then
    echo ">> Reusing existing instance $EXISTING_ID ($STATE)"
    INSTANCE_ID=$EXISTING_ID
  else
    echo ">> Existing instance $EXISTING_ID is $STATE, will create new"
    INSTANCE_ID=""
  fi
else
  INSTANCE_ID=""
fi

if [ -z "${INSTANCE_ID:-}" ]; then
  # User data — install Docker + git + compose plugin
  cat > /tmp/eventnexus-userdata.sh <<'USERDATA'
#!/bin/bash
set -euo pipefail
exec > /var/log/eventnexus-userdata.log 2>&1
echo "[userdata] start $(date)"

dnf update -y
dnf install -y docker git htop

systemctl enable --now docker
usermod -aG docker ec2-user

# Docker Compose v2 plugin
mkdir -p /usr/local/lib/docker/cli-plugins
curl -SL https://github.com/docker/compose/releases/download/v2.29.7/docker-compose-linux-x86_64 -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
# AL2023 also expects in /usr/libexec
mkdir -p /usr/libexec/docker/cli-plugins
cp /usr/local/lib/docker/cli-plugins/docker-compose /usr/libexec/docker/cli-plugins/docker-compose 2>/dev/null || true

# Verify
docker --version
docker compose version || /usr/local/lib/docker/cli-plugins/docker-compose version

# Allow ec2-user to run docker without relogin via systemd reload
systemctl restart docker
echo "[userdata] done $(date)"
USERDATA

  echo ">> Launching EC2 $INSTANCE_TYPE $AMI_ID in $SUBNET_A_ID"
  INSTANCE_ID=$(aws ec2 run-instances \
    --image-id $AMI_ID \
    --instance-type $INSTANCE_TYPE \
    --key-name $KEY_NAME \
    --security-group-ids $SG_EC2_ID \
    --subnet-id $SUBNET_A_ID \
    --associate-public-ip-address \
    --block-device-mappings "DeviceName=/dev/xvda,Ebs={VolumeSize=30,VolumeType=gp3,DeleteOnTermination=true}" \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=${TAG_PREFIX}-app},{Key=Project,Value=EventNexus}]" \
    --user-data file:///tmp/eventnexus-userdata.sh \
    --region $REGION \
    --query "Instances[0].InstanceId" --output text)
  echo "   INSTANCE_ID=$INSTANCE_ID"
  echo "   Waiting for instance running..."
  aws ec2 wait instance-running --instance-ids $INSTANCE_ID --region $REGION
  echo "   Waiting for status checks..."
  aws ec2 wait instance-status-ok --instance-ids $INSTANCE_ID --region $REGION || echo "   (status check wait timed out, continuing)"

  # Wait for userdata to complete (docker ready)
  echo "   Waiting 30s for userdata docker install..."
  sleep 30
fi

# 3) Fetch instance details
PUBLIC_IP=$(aws ec2 describe-instances --instance-ids $INSTANCE_ID --region $REGION --query "Reservations[0].Instances[0].PublicIpAddress" --output text)
PUBLIC_DNS=$(aws ec2 describe-instances --instance-ids $INSTANCE_ID --region $REGION --query "Reservations[0].Instances[0].PublicDnsName" --output text)
PRIVATE_IP=$(aws ec2 describe-instances --instance-ids $INSTANCE_ID --region $REGION --query "Reservations[0].Instances[0].PrivateIpAddress" --output text)
AZ=$(aws ec2 describe-instances --instance-ids $INSTANCE_ID --region $REGION --query "Reservations[0].Instances[0].Placement.AvailabilityZone" --output text)

echo ""
echo "== EC2 Ready =="
echo "INSTANCE_ID=$INSTANCE_ID"
echo "PUBLIC_IP=$PUBLIC_IP"
echo "PUBLIC_DNS=$PUBLIC_DNS"
echo "PRIVATE_IP=$PRIVATE_IP"
echo "AZ=$AZ"
echo "KEY_FILE=$KEY_FILE"

cat > infra/ec2-info.env <<EOF
INSTANCE_ID=$INSTANCE_ID
PUBLIC_IP=$PUBLIC_IP
PUBLIC_DNS=$PUBLIC_DNS
PRIVATE_IP=$PRIVATE_IP
AZ=$AZ
KEY_FILE=$KEY_FILE
EOF
cat infra/ec2-info.env

# 4) Test SSH (with retries)
echo ""
echo ">> Testing SSH to ec2-user@$PUBLIC_IP (wait up to 60s)..."
for i in {1..12}; do
  if ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no -o ConnectTimeout=5 ec2-user@$PUBLIC_IP "echo ready" 2>/dev/null | grep -q ready; then
    echo "   SSH ready"
    break
  fi
  echo "   attempt $i/12 - not ready, wait 5s..."
  sleep 5
  if [ $i -eq 12 ]; then
    echo "   WARNING: SSH not yet ready — userdata may still be running. Check logs:"
    echo "   ssh -i $KEY_FILE ec2-user@$PUBLIC_IP cat /var/log/eventnexus-userdata.log"
  fi
done

# Show docker health via SSH if ready
ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no ec2-user@$PUBLIC_IP "docker --version; docker compose version; cat /var/log/eventnexus-userdata.log | tail -20" 2>&1 | tail -30 || true

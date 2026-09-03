#!/usr/bin/env bash
set -euo pipefail
source infra/aws-ids.env
source infra/aws-helpers.sh
source infra/ec2-info.env

REGION="ap-southeast-2"
echo "== ALB Provisioning =="
echo "VPC=$VPC_ID SUBNETS=$SUBNET_A_ID,$SUBNET_B_ID SG_ALB=$SG_ALB_ID INSTANCE=$INSTANCE_ID PRIVATE_IP=$PRIVATE_IP"

# Check existing ALB
ALB_ARN=$(aws elbv2 describe-load-balancers --names $ALB_NAME --region $REGION --query "LoadBalancers[0].LoadBalancerArn" --output text 2>/dev/null | grep -v None || echo "")
if [ -n "$ALB_ARN" ] && [ "$ALB_ARN" != "None" ]; then
  echo ">> Reusing ALB $ALB_ARN"
  ALB_DNS=$(aws elbv2 describe-load-balancers --load-balancer-arns $ALB_ARN --region $REGION --query "LoadBalancers[0].DNSName" --output text)
else
  echo ">> Creating ALB $ALB_NAME"
  ALB_ARN=$(aws elbv2 create-load-balancer \
    --name $ALB_NAME \
    --subnets $SUBNET_A_ID $SUBNET_B_ID \
    --security-groups $SG_ALB_ID \
    --scheme internet-facing \
    --type application \
    --ip-address-type ipv4 \
    --tags Key=Name,Value=$ALB_NAME Key=Project,Value=EventNexus \
    --region $REGION \
    --query "LoadBalancers[0].LoadBalancerArn" --output text)
  ALB_DNS=$(aws elbv2 describe-load-balancers --load-balancer-arns $ALB_ARN --region $REGION --query "LoadBalancers[0].DNSName" --output text)
  echo "   ALB_ARN=$ALB_ARN"
  echo "   ALB_DNS=$ALB_DNS"
fi

echo "ALB_DNS=$ALB_DNS"

# Target Groups
TG_FRONTEND_ARN=$(aws elbv2 describe-target-groups --names $TG_FRONTEND --region $REGION --query "TargetGroups[0].TargetGroupArn" --output text 2>/dev/null | grep -v None || echo "")
if [ -z "$TG_FRONTEND_ARN" ] || [ "$TG_FRONTEND_ARN" == "None" ]; then
  echo ">> Creating TG $TG_FRONTEND (port 80)"
  TG_FRONTEND_ARN=$(aws elbv2 create-target-group \
    --name $TG_FRONTEND \
    --protocol HTTP --port 80 \
    --vpc-id $VPC_ID \
    --target-type instance \
    --health-check-protocol HTTP --health-check-path / --health-check-interval-seconds 30 --healthy-threshold-count 2 --unhealthy-threshold-count 3 --matcher HttpCode=200-399 \
    --tags Key=Name,Value=$TG_FRONTEND \
    --region $REGION --query "TargetGroups[0].TargetGroupArn" --output text)
  echo "   TG_FRONTEND_ARN=$TG_FRONTEND_ARN"
else
  echo ">> Reusing TG Frontend $TG_FRONTEND_ARN"
fi

TG_BACKEND_ARN=$(aws elbv2 describe-target-groups --names $TG_BACKEND --region $REGION --query "TargetGroups[0].TargetGroupArn" --output text 2>/dev/null | grep -v None || echo "")
if [ -z "$TG_BACKEND_ARN" ] || [ "$TG_BACKEND_ARN" == "None" ]; then
  echo ">> Creating TG $TG_BACKEND (port 5000)"
  TG_BACKEND_ARN=$(aws elbv2 create-target-group \
    --name $TG_BACKEND \
    --protocol HTTP --port 5000 \
    --vpc-id $VPC_ID \
    --target-type instance \
    --health-check-protocol HTTP --health-check-path /api/health --health-check-interval-seconds 30 --healthy-threshold-count 2 --unhealthy-threshold-count 3 --matcher HttpCode=200-399 \
    --tags Key=Name,Value=$TG_BACKEND \
    --region $REGION --query "TargetGroups[0].TargetGroupArn" --output text)
  echo "   TG_BACKEND_ARN=$TG_BACKEND_ARN"
else
  echo ">> Reusing TG Backend $TG_BACKEND_ARN"
fi

# Register targets (idempotent)
echo ">> Registering instance $INSTANCE_ID to TGs"
aws elbv2 register-targets --target-group-arn $TG_FRONTEND_ARN --targets Id=$INSTANCE_ID --region $REGION 2>&1 | head -5 || true
aws elbv2 register-targets --target-group-arn $TG_BACKEND_ARN --targets Id=$INSTANCE_ID --region $REGION 2>&1 | head -5 || true

# Listener
LISTENER_ARN=$(aws elbv2 describe-listeners --load-balancer-arn $ALB_ARN --region $REGION --query "Listeners[0].ListenerArn" --output text 2>/dev/null | grep -v None || echo "")
if [ -z "$LISTENER_ARN" ] || [ "$LISTENER_ARN" == "None" ]; then
  echo ">> Creating Listener 80 (default -> frontend)"
  LISTENER_ARN=$(aws elbv2 create-listener \
    --load-balancer-arn $ALB_ARN \
    --protocol HTTP --port 80 \
    --default-actions Type=forward,TargetGroupArn=$TG_FRONTEND_ARN \
    --region $REGION --query "Listeners[0].ListenerArn" --output text)
  echo "   LISTENER_ARN=$LISTENER_ARN"
  sleep 2
  # Rule for /api/* -> backend
  echo ">> Creating rule /api/* -> backend"
  aws elbv2 create-rule \
    --listener-arn $LISTENER_ARN \
    --priority 1 \
    --conditions Field=path-pattern,Values="/api/*" \
    --actions Type=forward,TargetGroupArn=$TG_BACKEND_ARN \
    --region $REGION 2>&1 | head -20 || true
else
  echo ">> Reusing Listener $LISTENER_ARN"
  # Ensure rule exists
  RULES=$(aws elbv2 describe-rules --listener-arn $LISTENER_ARN --region $REGION --query "Rules[?Priority=='1'].RuleArn" --output text 2>/dev/null || echo "")
  if [ -z "$RULES" ] || [ "$RULES" == "None" ]; then
    echo ">> Creating missing rule /api/* -> backend"
    aws elbv2 create-rule --listener-arn $LISTENER_ARN --priority 1 --conditions Field=path-pattern,Values="/api/*" --actions Type=forward,TargetGroupArn=$TG_BACKEND_ARN --region $REGION 2>&1 | head -20 || true
  else
    echo ">> Rule 1 already exists: $RULES"
  fi
fi

# Wait for ALB active
echo ">> Waiting for ALB active..."
aws elbv2 wait load-balancer-available --load-balancer-arns $ALB_ARN --region $REGION 2>&1 | head -5 || echo "wait timed, check manually"

# Final details
ALB_DNS=$(aws elbv2 describe-load-balancers --load-balancer-arns $ALB_ARN --region $REGION --query "LoadBalancers[0].DNSName" --output text)
ALB_ZONE=$(aws elbv2 describe-load-balancers --load-balancer-arns $ALB_ARN --region $REGION --query "LoadBalancers[0].CanonicalHostedZoneId" --output text)
echo ""
echo "== ALB Ready =="
echo "ALB_ARN=$ALB_ARN"
echo "ALB_DNS=$ALB_DNS"
echo "ALB_ZONE=$ALB_ZONE"
echo "LISTENER_ARN=$LISTENER_ARN"
echo "TG_FRONTEND_ARN=$TG_FRONTEND_ARN"
echo "TG_BACKEND_ARN=$TG_BACKEND_ARN"

cat > infra/alb-info.env <<EOF
ALB_ARN=$ALB_ARN
ALB_DNS=$ALB_DNS
ALB_ZONE=$ALB_ZONE
LISTENER_ARN=$LISTENER_ARN
TG_FRONTEND_ARN=$TG_FRONTEND_ARN
TG_BACKEND_ARN=$TG_BACKEND_ARN
EOF
cat infra/alb-info.env

echo ""
echo "Frontend URL: http://$ALB_DNS/"
echo "API URL:      http://$ALB_DNS/api"
echo "Health:       http://$ALB_DNS/api/health  and  http://$PUBLIC_IP:5000/api/health"

# Check target health
echo ""
echo ">> Target health (wait 30s for initial checks)"
sleep 10
aws elbv2 describe-target-health --target-group-arn $TG_FRONTEND_ARN --region $REGION 2>&1 | head -40
aws elbv2 describe-target-health --target-group-arn $TG_BACKEND_ARN --region $REGION 2>&1 | head -40

import { redirect } from "next/navigation";

// Merged into /register — organization registration now lives alongside
// attendee sign-up behind the top "Attendee | Organization" selector.
// Keep this route so existing links and bookmarks don't 404.
export default function OrgRegisterPage() {
  redirect("/register?type=organization");
}
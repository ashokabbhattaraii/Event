import type { EventData } from "@/lib/api/events";
import type { AppEvent } from "@/lib/data";

const GRADIENTS = [
  "linear-gradient(135deg,#5b4cf5,#00c9a7)",
  "linear-gradient(135deg,#ff6b35,#5b4cf5)",
  "linear-gradient(135deg,#00c9a7,#5b4cf5)",
  "linear-gradient(135deg,#5b4cf5,#ff6b35)",
];

// Deterministic gradient so a given event always looks the same.
const pickGradient = (id: string) => {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return GRADIENTS[Math.abs(h) % GRADIENTS.length];
};

const orgName = (event: EventData): string => {
  const o = event.organizer as { name?: string } | string;
  return typeof o === "object" && o?.name ? o.name : "Organizer";
};

// Map a real API event onto the shape the presentational EventCard expects.
// Card-only/mock fields (matchScore) are left undefined and hidden by the card.
export function toAppEvent(event: EventData): AppEvent {
  return {
    id: event._id,
    title: event.title,
    org: orgName(event),
    date: new Date(event.date).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }),
    type: event.type,
    venue: event.venue,
    registered: event.registered,
    capacity: event.capacity,
    predicted: event.registered,
    status: (event.status === "Draft" ? "Upcoming" : event.status) as AppEvent["status"],
    category: event.category,
    price: event.price,
    gradient: pickGradient(event._id),
  };
}

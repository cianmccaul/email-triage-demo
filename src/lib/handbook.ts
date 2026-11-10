/**
 * The clinic handbook: facts the assistant is allowed to use in replies.
 * Northbank Physio is a fictional clinic made up for this demo.
 *
 * Staff can edit this text in the app. The AI reads the edited version;
 * the built-in sorter uses the structured CLINIC facts below.
 */
export const CLINIC = {
  name: "Northbank Physio",
  hours: "Monday to Friday 8am to 8pm, and Saturday 9am to 1pm",
  prices: {
    initial: "€80 for an initial assessment (60 minutes)",
    followUp: "€70 for a follow-up (45 minutes)",
    massage: "€75 for a sports massage (60 minutes)",
  },
  insurers: "VHI, Laya and Irish Life",
  cancellation: "We ask for 24 hours' notice to move or cancel, otherwise a 50% fee applies.",
  signOff: "Kind regards,\nReception, Northbank Physio",
} as const;

export const DEFAULT_HANDBOOK = `${CLINIC.name} (a fictional clinic for this demo)

Opening hours: ${CLINIC.hours}. Closed Sundays.

Prices:
- Initial assessment, 60 minutes: €80
- Follow-up, 45 minutes: €70
- Sports massage, 60 minutes: €75
- Shockwave add-on: €30

Insurance: We're registered with ${CLINIC.insurers}. Patients pay on the day and claim it back. We email receipts on request.

Cancellations: ${CLINIC.cancellation}

Booking: Online through the booking page, or by phone during opening hours.

Gift vouchers: Any amount, bought online and emailed instantly.

Team: Sarah (physio, sports injuries), Mark (physio, back and neck), Lucy (massage therapist).

Safety: If someone describes new numbness or weakness, loss of bladder or bowel control, chest pain, or a suspected fracture, tell them to contact their GP or go to the emergency department now. Then offer the next available appointment.

Replies: Start with "Hi [first name],". Keep it short and warm. End with:
${CLINIC.signOff}`;

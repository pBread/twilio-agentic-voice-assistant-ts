import type { Procedure } from "../types.js";

export const procedures: Record<string, Procedure> = [
  {
    id: "identify_user",
    description:
      "Verify the identity of a user through context or active identification",
    steps: [
      {
        id: "get_identifier",
        description:
          "Gather an identifier from the user that can be used to lookup their account.",
        strictness: "conditional",
        completionCriteria:
          "Valid email address or phone number has been provided",
        conditions:
          "This is not required when the user's profile has been provided in context. ",
        instructions: "",
      },
      {
        id: "verify_identifier",
        description: "Verify the provided identifier is valid",
        strictness: "conditional",
        completionCriteria: "Identifier has been validated",
        conditions: "Required when get_identifier step was performed",
        instructions:
          "Ensure email format is valid or phone number is in correct format",
      },
      {
        id: "confirm_identity",
        description: "Confirm user identity using available information",
        strictness: "required",
        completionCriteria: "User has verbally confirmed their identity",
        instructions:
          "If profile exists in context, confirm name. Otherwise, confirm details from identifier.",
      },
    ],
  },
  {
    id: "provide_order_information",
    description:
      "Retrieve and present order information based on available context and identifiers",
    steps: [
      {
        id: "identify_user",
        description: "Verify user identity if needed",
        strictness: "conditional",
        completionCriteria:
          "Either confirmation number provided OR user identity verified",
        conditions: "Skip if valid confirmation number provided",
        instructions:
          "Only perform user identification if no confirmation number is provided",
      },
      {
        id: "gather_order_details",
        description: "Collect information needed to locate the order",
        strictness: "critical",
        completionCriteria:
          "Either: (A) Valid CN-00-00-00 format confirmation number obtained, OR (B) Order description collected from verified user",
        instructions:
          "Accept confirmation number or gather order description if user is verified",
      },
      {
        id: "confirm_order",
        description: "Verify order details with user",
        strictness: "required",
        completionCriteria: "User has confirmed the order details are correct",
        instructions:
          "Review key order details with user to ensure correct order was found",
      },
    ],
  },
  {
    id: "process_refund_request",
    description:
      "Handle customer refund requests according to defined policies and approval workflows",
    steps: [
      {
        id: "identify_user",
        description: "Verify the identity of the user requesting the refund",
        strictness: "critical",
        completionCriteria:
          "User identity has been verified through account information or order details",
        instructions:
          "Confirm user identity through account details, email address, or other identifying information associated with the order",
      },
      {
        id: "locate_order",
        description:
          "Find the specific order for which a refund is being requested",
        strictness: "critical",
        completionCriteria:
          "Valid order record has been located in the system with matching user information",
        instructions:
          "Use order number, confirmation ID, or search by user purchase history to locate the exact order",
      },
      {
        id: "gather_refund_reason",
        description:
          "Collect the reason for the refund request from the customer",
        strictness: "required",
        completionCriteria: "A clear reason for the refund has been documented",
        instructions:
          "Document the specific reason provided by the customer for requesting the refund",
      },
      {
        id: "evaluate_standard_refund_eligibility",
        description:
          "Determine if the order meets standard automated refund criteria",
        strictness: "conditional",
        completionCriteria:
          "Eligibility for standard automated refund has been determined",
        conditions: "Apply if refund can be processed without human approval",
        instructions:
          "Verify that order total is under $50 AND the refund is being requested within 48 hours of delivery",
      },
      {
        id: "request_human_approval",
        description:
          "Obtain approval from a human agent for refunds outside standard criteria",
        strictness: "conditional",
        completionCriteria:
          "Human agent has provided explicit approval for the refund",
        conditions:
          "Apply if order total is between $50-$150 OR refund is requested between 48 hours and 1 week after delivery",
        instructions:
          "Contact human agent with order details, refund reason, and request approval for processing",
      },
      {
        id: "send_confirmation_sms",
        description:
          "Send an SMS confirmation to the customer before processing the refund",
        strictness: "required",
        completionCriteria:
          "SMS confirmation has been sent to the customer's verified phone number",
        instructions:
          "Include order number, refund amount, and estimated processing time in the SMS message",
      },
      {
        id: "execute_refund",
        description: "Process the refund through the payment system",
        strictness: "critical",
        completionCriteria:
          "Refund has been successfully processed and confirmation received from payment system",
        conditions:
          "Only execute if either standard eligibility criteria are met OR human approval has been obtained",
        instructions:
          "Use the refund processing tool to issue the refund to the original payment method",
      },
      {
        id: "document_refund",
        description: "Record all details of the processed refund",
        strictness: "required",
        completionCriteria:
          "All refund details have been documented in the order record",
        instructions:
          "Update order record with refund amount, reason, approval details (if applicable), and confirmation number",
      },
    ],
  },
].reduce((acc, cur) => Object.assign(acc, { [cur.id]: cur }), {});

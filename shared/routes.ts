import { z } from "zod";
import { insertInquirySchema } from "./schema";

export const api = {
  inquiries: {
    create: {
      method: "POST" as const,
      path: "/api/inquiries",
      input: insertInquirySchema,
      responses: {
        201: insertInquirySchema,
        400: z.object({ message: z.string() }),
      },
    },
  },
};

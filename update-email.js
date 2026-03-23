const fs = require('fs');
const path = 'canton-financial-test/server/emailRouter.ts';
let content = fs.readFileSync(path, 'utf8');

// Add submitContactForm mutation
if (!content.includes('submitContactForm')) {
  const mutationToAdd = `
  submitContactForm: publicProcedure
    .input(z.object({
      name: z.string().min(1, "Name is required"),
      email: z.string().email("Invalid email format"),
      phone: z.string().optional(),
      subject: z.string().min(1, "Subject is required"),
      message: z.string().min(10, "Message must be at least 10 characters")
    }))
    .mutation(async ({ input }) => {
      const { sendEmail } = await import("./emailService");
      
      const html = \`
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> \${input.name}</p>
        <p><strong>Email:</strong> \${input.email}</p>
        <p><strong>Phone:</strong> \${input.phone || 'N/A'}</p>
        <p><strong>Subject:</strong> \${input.subject}</p>
        <h3>Message:</h3>
        <p style="white-space: pre-wrap;">\${input.message}</p>
      \`;

      const success = await sendEmail({
        to: "customer-services@cmfinancial.com",
        subject: \`Website Contact: \${input.subject}\`,
        html,
      });

      if (!success) {
        throw new Error("Failed to send message. Please try again later.");
      }

      return { success: true };
    }),
`;
  
  content = content.replace('export const emailRouter = router({', 'export const emailRouter = router({' + mutationToAdd);
  fs.writeFileSync(path, content);
  console.log('Added submitContactForm to emailRouter.ts');
} else {
  console.log('submitContactForm already exists');
}

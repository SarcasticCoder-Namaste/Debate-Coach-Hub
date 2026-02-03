import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertInquirySchema, type InsertInquiry } from "@shared/schema";
import { useCreateInquiry } from "@/hooks/use-inquiries";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";

export function ContactForm() {
  const { mutate, isPending } = useCreateInquiry();
  
  const form = useForm<InsertInquiry>({
    resolver: zodResolver(insertInquirySchema),
    defaultValues: {
      name: "",
      email: "",
      message: "",
    },
  });

  function onSubmit(data: InsertInquiry) {
    mutate(data, {
      onSuccess: () => {
        form.reset();
      },
    });
  }

  return (
    <div className="bg-white rounded-2xl p-8 md:p-10 shadow-xl border border-border/50">
      <div className="mb-8">
        <h3 className="text-2xl font-bold font-display text-primary mb-2">Send a Message</h3>
        <p className="text-muted-foreground">
          Ready to elevate your speaking skills? Fill out the form below to schedule your free consultation.
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground font-semibold">Full Name</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="John Doe" 
                    className="h-12 px-4 bg-muted/30 border-border/60 focus:bg-white focus:border-primary focus:ring-primary/10 transition-all rounded-lg"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground font-semibold">Email Address</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="john@example.com" 
                    className="h-12 px-4 bg-muted/30 border-border/60 focus:bg-white focus:border-primary focus:ring-primary/10 transition-all rounded-lg"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-foreground font-semibold">How can I help you?</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Tell me about your debate experience and goals..." 
                    className="min-h-[120px] p-4 bg-muted/30 border-border/60 focus:bg-white focus:border-primary focus:ring-primary/10 transition-all rounded-lg resize-y"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button 
            type="submit" 
            disabled={isPending}
            className="w-full h-12 text-lg font-semibold bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 rounded-lg transition-all hover:-translate-y-0.5"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                Send Message
                <Send className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}

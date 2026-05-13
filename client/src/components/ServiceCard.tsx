import { LucideIcon, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ServiceCardProps {
  title: string;
  description: string;
  price: string;
  features: string[];
  icon: LucideIcon;
  onBook: () => void;
  recommended?: boolean;
}

export function ServiceCard({ 
  title, 
  description, 
  price, 
  features, 
  icon: Icon, 
  onBook,
  recommended = false 
}: ServiceCardProps) {
  return (
    <Card className={`relative flex flex-col h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
      recommended 
        ? "border-primary shadow-lg shadow-primary/10 ring-1 ring-primary/20" 
        : "border-border/60 shadow-md hover:border-primary/50"
    }`}>
      {recommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
          Most Popular
        </div>
      )}
      
      <CardHeader>
        <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center mb-4">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold font-display text-primary">{title}</CardTitle>
        <CardDescription className="text-muted-foreground mt-2">{description}</CardDescription>
      </CardHeader>
      
      <CardContent className="flex-grow">
        <div className="mb-6">
          <span className="text-3xl font-bold text-foreground">{price}</span>
          <span className="text-muted-foreground text-sm"> / session</span>
        </div>
        
        <ul className="space-y-3">
          {features.map((feature, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">
              <CheckCircle2 className="w-5 h-5 text-accent shrink-0" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      
      <CardFooter>
        <Button 
          data-testid={`button-book-${title.toLowerCase().replace(/\s+/g, "-")}`}
          onClick={onBook} 
          className={`w-full py-6 font-semibold transition-all ${
            recommended 
              ? "bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 hover:shadow-xl" 
              : "bg-white text-primary border-2 border-primary hover:bg-primary/5"
          }`}
        >
          Book Now
        </Button>
      </CardFooter>
    </Card>
  );
}

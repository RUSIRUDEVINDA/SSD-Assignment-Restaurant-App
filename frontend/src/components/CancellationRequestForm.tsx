import React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

const cancellationSchema = z.object({
  reason: z.string().min(1, "Please select a reason for cancellation"),
});

type CancellationFormType = z.infer<typeof cancellationSchema>;

interface CancellationRequestFormProps {
  reservationId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const cancellationReasons = [
  "Change of plans",
  "Change in travel plans",
  "Found a better offer",
  "Personal reasons",
  "Other"
];

const CancellationRequestForm = ({ reservationId, onClose, onSuccess }: CancellationRequestFormProps) => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<CancellationFormType>({
    resolver: zodResolver(cancellationSchema),
  });
  const [reason, setReason] = React.useState("");
  const [otherReason, setOtherReason] = React.useState("");

  const onSubmit = (data: CancellationFormType) => {
    // In a real app, this would send the request to the backend
    setTimeout(() => {
      toast.success("Cancellation request submitted successfully!", {
        style: {
          background: "#10b981",
          color: "white",
          border: "none",
        },
        icon: "✅",
      });
      if (onSuccess) {
        onSuccess();
      }
      onClose();
    }, 1000);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Request Cancellation</CardTitle>
        <CardDescription>
          Please provide a reason for your cancellation request. We'll review it as soon as possible.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(() => onSubmit({ reason: reason === "Other" ? otherReason : reason }))}>
        <CardContent>
          <div className="space-y-4">
            <div className="text-xs text-red-600 font-medium mb-2">
              Note: You can only request a cancellation at least 30 minutes before the pickup time.
            </div>
            <div>
              <Label htmlFor="reason">Reason for Cancellation</Label>
              <select
                id="reason"
                value={reason}
                onChange={e => setReason(e.target.value)}
                required
                className="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-aerox-blue"
              >
                <option value="" disabled>Select a reason</option>
                {cancellationReasons.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              {reason === "Other" && (
                <input
                  type="text"
                  value={otherReason}
                  onChange={e => setOtherReason(e.target.value)}
                  placeholder="Please specify your reason (required)"
                  className="w-full border rounded px-3 py-2 mt-2 focus:outline-none focus:ring-2 focus:ring-aerox-blue"
                  maxLength={200}
                  required
                />
              )}
              {errors.reason && (
                <p className="text-red-500 text-sm mt-1">{errors.reason.message}</p>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || !reason || (reason === "Other" && !otherReason.trim())}>
            {isSubmitting ? "Submitting..." : "Submit Request"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default CancellationRequestForm;

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function PaidUpgradesUnavailable() {
  return (
    <Card className="mx-auto my-8 max-w-xl">
      <CardHeader><CardTitle>Paid upgrades are not available yet</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <Button asChild><Link to="/dashboard/business/package">Back to subscription</Link></Button>
      </CardContent>
    </Card>
  );
}

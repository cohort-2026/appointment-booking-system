import { createRoot } from "react-dom/client"
import "../index.css"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription, DialogHeader } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog"
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from "@/components/ui/sheet"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { useIsMobile } from "@/hooks/use-mobile"

const longContent = Array.from({ length: 24 }, (_, i) => <p key={i} className="my-3">Preview row {i + 1}: long content must remain readable and scrollable.</p>)

export function Preview() {
  const mobile = useIsMobile()
  return <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-8">
    <h1 className="font-heading text-3xl font-semibold">Shared UI kit</h1>
    <p>Development preview • <span data-testid="viewport">{mobile ? "Mobile" : "Desktop"}</span></p>
    <Card><CardHeader><CardTitle>Forms and buttons</CardTitle></CardHeader><CardContent className="space-y-4">
      <Label htmlFor="name">Name</Label><Input id="name" placeholder="Enter a name" />
      <div className="flex flex-wrap gap-2"><Button>Primary</Button><Button variant="outline">Outline</Button><Button disabled>Disabled</Button></div>
      <Select><SelectTrigger aria-label="Service"><SelectValue placeholder="Choose a service" /></SelectTrigger><SelectContent><SelectItem value="preview">Preview service</SelectItem></SelectContent></Select>
    </CardContent></Card>
    <div className="flex flex-wrap gap-3">
      <Dialog><DialogTrigger asChild><Button>Open dialog</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Long dialog</DialogTitle><DialogDescription>Scroll to the final row, then press Escape.</DialogDescription></DialogHeader><div>{longContent}</div></DialogContent></Dialog>
      <AlertDialog><AlertDialogTrigger asChild><Button variant="outline">Open confirmation</Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Long confirmation</AlertDialogTitle><AlertDialogDescription>Preview only; confirming makes no changes.</AlertDialogDescription></AlertDialogHeader><div>{longContent}</div><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction>Confirm</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      <Sheet><SheetTrigger asChild><Button variant="outline">Open sheet</Button></SheetTrigger><SheetContent><SheetHeader><SheetTitle>Long sheet</SheetTitle><SheetDescription>Scroll to the close action.</SheetDescription></SheetHeader><div className="shrink-0 px-4">{longContent}</div><SheetFooter><SheetClose asChild><Button>Done</Button></SheetClose></SheetFooter></SheetContent></Sheet>
    </div>
  </main>
}

if (import.meta.env.DEV) createRoot(document.getElementById("root")!).render(<Preview />)

"use client";

import * as React from "react";

import { Badge, ItemStatusBadge, ItemTypeBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker, DateRangePicker, type DateRange } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PhotoPicker } from "@/components/ui/photo-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { UserAvatar } from "@/components/ui/avatar";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t pt-8">
      <h2 className="text-h3">{title}</h2>
      {children}
    </section>
  );
}

const swatches = [
  "background", "card", "muted", "primary", "secondary", "accent", "success", "warning", "danger",
  "lost", "found", "status-open", "status-claimed", "status-resolved",
  "brand-pink", "brand-yellow", "brand-blue", "brand-lime",
];

export function Showcase() {
  const [date, setDate] = React.useState<Date>();
  const [range, setRange] = React.useState<DateRange>();
  const [photos, setPhotos] = React.useState<File[]>([]);
  const [idPhoto, setIdPhoto] = React.useState<File[]>([]);
  const [saving, setSaving] = React.useState(false);

  return (
    <div className="flex flex-col gap-10">
      <Section title="Colour tokens">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {swatches.map((s) => (
            <div key={s} className="flex flex-col gap-1.5">
              <div className="h-14 rounded-lg border" style={{ background: `var(--${s})` }} />
              <code className="text-caption text-muted-foreground">{s}</code>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Type">
        <p className="text-display font-display">Lost it? Chill.</p>
        <p className="text-h1 font-display">Heading 1</p>
        <p className="text-h2 font-display">Heading 2</p>
        <p className="text-h3 font-display">Heading 3</p>
        <p className="text-body">Body — Someone handed in a blue JanSport backpack at the Main Library.</p>
        <p className="text-small text-muted-foreground">Small — Posted 2 hours ago</p>
        <p className="text-caption text-muted-foreground">Caption — Max 5 MB per photo</p>
      </Section>

      <Section title="Button">
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="link">Link</Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            loading={saving}
            onClick={() => {
              setSaving(true);
              setTimeout(() => setSaving(false), 1500);
            }}
          >
            {saving ? "Posting…" : "Click to load"}
          </Button>
          <Button disabled>Disabled</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
        </div>
      </Section>

      <Section title="Form fields">
        <div className="grid gap-5 md:grid-cols-2">
          <Field id="title" label="Item name" hint="e.g. Black JanSport backpack" required>
            <Input id="title" placeholder="What is it?" />
          </Field>
          <Field id="title-err" label="Item name" error="Give the item a name">
            <Input id="title-err" placeholder="What is it?" />
          </Field>
          <Field id="category" label="Category">
            <Select>
              <SelectTrigger id="category">
                <SelectValue placeholder="Pick a category" />
              </SelectTrigger>
              <SelectContent>
                {["Electronics", "IDs & cards", "Keys", "Bags & bottles", "Books & notes", "Clothing", "Other"].map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id="date" label="Date found">
            <DatePicker id="date" value={date} onChange={setDate} disabledDays={{ after: new Date() }} clearable />
          </Field>
          <Field id="range" label="Date range (Browse filter)">
            <DateRangePicker id="range" value={range} onChange={setRange} />
          </Field>
          <Field id="disabled" label="Disabled">
            <Input id="disabled" disabled defaultValue="Can't edit" />
          </Field>
          <Field id="desc" label="Description" hint="Don't include the detail only the owner would know." className="md:col-span-2">
            <Textarea id="desc" placeholder="Colour, brand, stickers, where exactly you found it…" />
          </Field>
        </div>
        <div className="flex flex-wrap gap-8">
          <div className="flex items-center gap-2.5">
            <Checkbox id="confirm" />
            <Label htmlFor="confirm" className="font-normal">I confirm this item is mine</Label>
          </div>
          <div className="flex items-center gap-2.5">
            <Switch id="notify" defaultChecked />
            <Label htmlFor="notify" className="font-normal">Notify me about matches</Label>
          </div>
        </div>
      </Section>

      <Section title="Photo picker">
        <div className="grid gap-6 md:grid-cols-2">
          <Field id="photos" label="Photos (Report Item / Claim proof)">
            <PhotoPicker id="photos" value={photos} onChange={setPhotos} accept="image/*,video/mp4" onReject={(m) => toast.error(m)} />
          </Field>
          <Field id="id-photo" label="Front of student ID (Verify ID)">
            <PhotoPicker id="id-photo" value={idPhoto} onChange={setIdPhoto} maxFiles={1} capture="environment" label="Take or upload a photo" />
          </Field>
        </div>
      </Section>

      <Section title="Badge + Avatar">
        <div className="flex flex-wrap items-center gap-2">
          <ItemTypeBadge type="LOST" />
          <ItemTypeBadge type="FOUND" />
          <ItemStatusBadge status="OPEN" />
          <ItemStatusBadge status="CLAIMED" />
          <ItemStatusBadge status="RESOLVED" />
          <Badge variant="warning">Pending</Badge>
          <Badge variant="success">Approved</Badge>
          <Badge variant="danger">Rejected</Badge>
          <Badge>Neutral</Badge>
          <Badge variant="outline">Outline</Badge>
        </div>
        <div className="flex items-center gap-4">
          <UserAvatar name="Tobi Adeyemi" size="sm" />
          <UserAvatar name="Ada Obi" verified />
          <UserAvatar name="Kemi Bello" size="lg" verified />
        </div>
      </Section>

      <Section title="Card shell">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Claims on your posts</CardTitle>
              <CardDescription>2 people say the calculator is theirs</CardDescription>
              <CardAction>
                <Badge variant="warning">2 new</Badge>
              </CardAction>
            </CardHeader>
            <CardContent className="text-small text-muted-foreground">Card body goes here.</CardContent>
            <CardFooter>
              <Button size="sm">Review claims</Button>
            </CardFooter>
          </Card>
          <Card interactive>
            <CardHeader>
              <CardTitle>Interactive card</CardTitle>
              <CardDescription>Lifts on hover — use for clickable cards.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </Section>

      <Section title="Tabs">
        <Tabs defaultValue="lost">
          <TabsList>
            <TabsTrigger value="lost">Lost</TabsTrigger>
            <TabsTrigger value="found">Found</TabsTrigger>
            <TabsTrigger value="closed">Closed</TabsTrigger>
          </TabsList>
          <TabsContent value="lost" className="text-muted-foreground">Your lost reports.</TabsContent>
          <TabsContent value="found" className="text-muted-foreground">Items you found.</TabsContent>
          <TabsContent value="closed" className="text-muted-foreground">Returned or removed.</TabsContent>
        </Tabs>
      </Section>

      <Section title="Dialog, sheet + toast">
        <div className="flex flex-wrap gap-3">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="danger">Delete post</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete this post?</DialogTitle>
                <DialogDescription>Any open claims will be rejected. This can&apos;t be undone.</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button variant="danger" onClick={() => toast.success("Post deleted")}>
                    Delete
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">Filters (bottom sheet)</Button>
            </SheetTrigger>
            <SheetContent side="bottom">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
                <SheetDescription>Mobile filter drawer for Browse.</SheetDescription>
              </SheetHeader>
              <DateRangePicker />
              <SheetFooter>
                <Button fullWidth>Show results</Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>
          <Button variant="secondary" onClick={() => toast.success("Item posted", { description: "It's under review — usually live within an hour." })}>
            Success toast
          </Button>
          <Button variant="outline" onClick={() => toast.error("Couldn't upload photo", { description: "Max 5 MB per photo." })}>
            Error toast
          </Button>
        </div>
      </Section>
    </div>
  );
}

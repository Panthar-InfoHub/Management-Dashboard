"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, Video, Flag, Users, Rocket, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const hours = Array.from({ length: 12 }, (_, i) => i + 8);

const events = [
  { id: 1, title: "Daily Standup", time: "09:00", duration: 1, day: 0, type: "meeting", color: "bg-blue-500/20 border-blue-500/40 text-blue-600 dark:text-blue-400" },
  { id: 2, title: "Sprint Planning", time: "10:00", duration: 2, day: 0, type: "meeting", color: "bg-purple-500/20 border-purple-500/40 text-purple-600 dark:text-purple-400" },
  { id: 3, title: "Design Review", time: "14:00", duration: 1, day: 1, type: "review", color: "bg-pink-500/20 border-pink-500/40 text-pink-600 dark:text-pink-400" },
  { id: 4, title: "v2.5 Release", time: "16:00", duration: 2, day: 2, type: "release", color: "bg-green-500/20 border-green-500/40 text-green-600 dark:text-green-400" },
  { id: 5, title: "1:1 with Arjun", time: "11:00", duration: 1, day: 3, type: "meeting", color: "bg-blue-500/20 border-blue-500/40 text-blue-600 dark:text-blue-400" },
  { id: 6, title: "Sprint Retro", time: "15:00", duration: 1, day: 4, type: "standup", color: "bg-amber-500/20 border-amber-500/40 text-amber-600 dark:text-amber-400" },
  { id: 7, title: "API Deadline", time: "17:00", duration: 1, day: 4, type: "deadline", color: "bg-red-500/20 border-red-500/40 text-red-600 dark:text-red-400" },
];

export default function CalendarPage() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground">View meetings, sprints, releases, and deadlines.</p>
        </div>
        <Button size="sm" className="gap-2 text-xs"><Plus className="h-3.5 w-3.5" /> New Event</Button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8"><ChevronLeft className="h-4 w-4" /></Button>
          <h2 className="text-sm font-semibold">July 14 – 20, 2025</h2>
          <Button variant="ghost" size="icon" className="h-8 w-8"><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" className="text-xs">Today</Button>
          <Tabs defaultValue="week">
            <TabsList className="h-8">
              <TabsTrigger value="day" className="text-xs px-2 h-6">Day</TabsTrigger>
              <TabsTrigger value="week" className="text-xs px-2 h-6">Week</TabsTrigger>
              <TabsTrigger value="month" className="text-xs px-2 h-6">Month</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <Card className="border-border/50 overflow-hidden">
        <CardContent className="p-0">
          {/* Header */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border">
            <div className="p-2" />
            {days.map((day, i) => (
              <div key={day} className={cn("p-2 text-center border-l border-border", i === 1 && "bg-accent/30")}>
                <p className="text-[10px] text-muted-foreground uppercase">{day}</p>
                <p className={cn("text-sm font-semibold", i === 1 && "text-blue-500")}>{14 + i}</p>
              </div>
            ))}
          </div>
          {/* Time grid */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)]">
            {hours.map(hour => (
              <div key={hour} className="contents">
                <div className="h-16 border-b border-border p-1 text-right">
                  <span className="text-[10px] text-muted-foreground">{hour}:00</span>
                </div>
                {days.map((_, dayIdx) => {
                  const dayEvents = events.filter(e => e.day === dayIdx && parseInt(e.time) === hour);
                  return (
                    <div key={dayIdx} className={cn("relative h-16 border-b border-l border-border hover:bg-accent/20 transition-colors", dayIdx === 1 && "bg-accent/10")}>
                      {dayEvents.map(event => (
                        <div key={event.id} className={cn("absolute inset-x-0.5 top-0.5 rounded-md border px-1.5 py-0.5 text-[10px] font-medium cursor-pointer transition-colors hover:opacity-90", event.color)} style={{ height: `${event.duration * 64 - 4}px` }}>
                          <p className="truncate">{event.title}</p>
                          <p className="text-[9px] opacity-70">{event.time}</p>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

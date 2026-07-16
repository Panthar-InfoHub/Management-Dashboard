"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarUI } from "@/components/ui/calendar";
import { dailyUpdates, employees } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { Sparkles, Calendar, AlertCircle } from "lucide-react";

export default function DailyUpdatesPage() {
  const [date, setDate] = useState<Date>();
  const groupedUpdates = dailyUpdates.reduce((acc, update) => {
    if (!acc[update.date]) {
      acc[update.date] = [];
    }
    acc[update.date].push(update);
    return acc;
  }, {} as Record<string, typeof dailyUpdates>);

  const sortedDates = Object.keys(groupedUpdates).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  // If a date is selected, filter sortedDates to only include that date
  const filteredDates = date 
    ? sortedDates.filter(d => d === format(date, "yyyy-MM-dd"))
    : sortedDates;

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Daily Updates</h1>
          <p className="text-sm text-muted-foreground mt-1">Company-wide daily standup feed.</p>
        </div>
        <Button 
          onClick={() => document.dispatchEvent(new CustomEvent("open-submit-update"))}
          className="gap-2 shrink-0"
        >
          <Sparkles className="h-4 w-4" /> Submit Update
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between mt-6 border-b border-border/50 pb-4">
        <h2 className="text-sm font-semibold">Feed Timeline</h2>
        <div className="flex items-center gap-2">
          {date && (
            <Button variant="ghost" size="sm" onClick={() => setDate(undefined)} className="h-8 text-xs text-muted-foreground">
              Clear
            </Button>
          )}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("gap-2 border-border/50 bg-background h-8", !date && "text-muted-foreground")}>
                <Calendar className="h-4 w-4" /> 
                {date ? format(date, "PPP") : "Select Date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarUI
                mode="single"
                selected={date}
                onSelect={setDate}
                
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Feed */}
      <div className="space-y-6 mt-6">
        {filteredDates.length === 0 ? (
          <div className="text-center py-12 border border-dashed rounded-lg border-border/50">
            <p className="text-muted-foreground text-sm">No updates found for this date.</p>
          </div>
        ) : (
          filteredDates.map(date => {
          const dayUpdates = groupedUpdates[date];
          return (
            <div key={date} className="relative pl-4 border-l-2 border-border/50 space-y-4">
              <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-background border-2 border-primary" />
              <div className="flex items-center gap-2 -mt-1.5 mb-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">
                  {new Date(date).toLocaleDateString("en-US", { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </h3>
                <Badge variant="secondary" className="text-[10px] ml-2">{dayUpdates.length} updates</Badge>
              </div>

              <Card className="border-border/50 shadow-sm overflow-hidden">
                <CardContent className="p-0 divide-y divide-border/50">
                  {dayUpdates.map(update => {
                    const emp = employees.find(e => e.id === update.user);
                    return (
                      <div key={update.id} className="p-5 flex gap-4 hover:bg-accent/30 transition-colors">
                        <Avatar className="h-9 w-9 mt-0.5 shrink-0 border border-border/50">
                          <AvatarFallback className="bg-primary/10 text-xs font-medium">{emp?.avatar}</AvatarFallback>
                        </Avatar>
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold">{emp?.name}</span>
                            <span className="text-[11px] text-muted-foreground font-medium">{emp?.role}</span>
                          </div>
                          
                          <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed mt-1">
                            <span className="font-medium text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Accomplished</span>
                            {update.accomplished}
                          </div>
                          
                          {update.blockers !== "None" && (
                            <div className="text-sm text-destructive whitespace-pre-wrap leading-relaxed mt-3 bg-destructive/5 border border-destructive/20 p-2.5 rounded-md flex gap-2 items-start">
                              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                              <div>
                                <span className="font-medium text-[10px] uppercase tracking-wider text-destructive block mb-0.5">Blocker</span>
                                {update.blockers}
                              </div>
                            </div>
                          )}
                          
                          <div className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed mt-3">
                            <span className="font-medium text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">Tomorrow's Plan</span>
                            {update.plan}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          );
        })
      )}
      </div>
    </div>
  );
}

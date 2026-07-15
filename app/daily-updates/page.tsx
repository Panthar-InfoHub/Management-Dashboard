"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { dailyUpdates, employees } from "@/lib/mock-data";
import { cn } from "@/lib/utils";
import { MessageSquare, Plus, Heart, ThumbsUp, Flame, TrendingUp, Users, AlertCircle, Calendar, Sparkles, Send, CheckCircle2, XCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

const moodEmoji: Record<string, string> = { productive: "🚀", focused: "🎯", excited: "⚡", creative: "🎨" };

export default function DailyUpdatesPage() {
  const submitted = dailyUpdates.length;
  const total = employees.length;
  const compliance = Math.round((submitted / total) * 100);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Daily Updates</h1>
          <p className="text-sm text-muted-foreground">Company-wide daily update feed and submission.</p>
        </div>
        <Button size="sm" className="gap-2 text-xs"><Send className="h-3.5 w-3.5" /> Submit Update</Button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border/50"><CardContent className="p-3">
          <div className="flex items-center gap-2"><div className="flex h-7 w-7 items-center justify-center rounded-md bg-green-500/10"><CheckCircle2 className="h-3.5 w-3.5 text-green-500" /></div></div>
          <p className="text-lg font-semibold mt-1">{submitted}</p><p className="text-[11px] text-muted-foreground">Submitted Today</p>
        </CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-3">
          <div className="flex items-center gap-2"><div className="flex h-7 w-7 items-center justify-center rounded-md bg-red-500/10"><XCircle className="h-3.5 w-3.5 text-red-500" /></div></div>
          <p className="text-lg font-semibold mt-1">{total - submitted}</p><p className="text-[11px] text-muted-foreground">Pending</p>
        </CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-3">
          <div className="flex items-center gap-2"><div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-500/10"><TrendingUp className="h-3.5 w-3.5 text-blue-500" /></div></div>
          <p className="text-lg font-semibold mt-1">{compliance}%</p><p className="text-[11px] text-muted-foreground">Compliance Rate</p>
        </CardContent></Card>
        <Card className="border-border/50"><CardContent className="p-3">
          <div className="flex items-center gap-2"><div className="flex h-7 w-7 items-center justify-center rounded-md bg-orange-500/10"><Flame className="h-3.5 w-3.5 text-orange-500" /></div></div>
          <p className="text-lg font-semibold mt-1">22</p><p className="text-[11px] text-muted-foreground">Longest Streak</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="feed">
        <TabsList>
          <TabsTrigger value="feed" className="text-xs">Feed</TabsTrigger>
          <TabsTrigger value="submit" className="text-xs">Submit Update</TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="feed" className="mt-4 space-y-3">
          {dailyUpdates.map(update => {
            const emp = employees.find(e => e.id === update.user);
            return (
              <Card key={update.id} className="border-border/50 hover:border-border transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-primary/10 text-xs font-medium">{emp?.avatar}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{emp?.name}</span>
                        <Badge variant="secondary" className="text-[9px]">{emp?.team}</Badge>
                        <span className="text-[10px] text-muted-foreground ml-auto">{update.date}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{emp?.role}</p>

                      <div className="mt-3 space-y-2">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Accomplished</p>
                          <p className="text-xs text-foreground leading-relaxed">{update.accomplished}</p>
                        </div>
                        {update.blockers !== "None" && (
                          <div className="flex items-start gap-2 rounded-md bg-red-500/5 border border-red-500/10 p-2">
                            <AlertCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-red-500 font-medium">Blocker</p>
                              <p className="text-xs text-foreground">{update.blockers}</p>
                            </div>
                          </div>
                        )}
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">Tomorrow&apos;s Plan</p>
                          <p className="text-xs text-muted-foreground">{update.plan}</p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between pt-2 border-t border-border/50">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{moodEmoji[update.mood] || "😊"}</span>
                          <Badge variant="secondary" className="text-[10px]">Progress: {update.progress}%</Badge>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <button className="flex items-center gap-1 hover:text-foreground transition-colors">
                            <Heart className="h-3.5 w-3.5" /> {update.reactions}
                          </button>
                          <button className="flex items-center gap-1 hover:text-foreground transition-colors">
                            <MessageSquare className="h-3.5 w-3.5" /> {update.comments}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="submit" className="mt-4">
          <Card className="border-border/50 max-w-2xl">
            <CardHeader>
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-purple-500" /> Submit Your Daily Update
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">What did you accomplish today?</label>
                <Textarea placeholder="Describe what you worked on today…" className="min-h-[80px] text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Any blockers or risks?</label>
                <Textarea placeholder="Describe any blockers…" className="min-h-[60px] text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">What&apos;s your plan for tomorrow?</label>
                <Textarea placeholder="Tomorrow's plan…" className="min-h-[60px] text-sm" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Mood:</span>
                {["🚀", "🎯", "⚡", "🎨", "😊", "😴"].map(emoji => (
                  <button key={emoji} className="text-lg hover:scale-125 transition-transform">{emoji}</button>
                ))}
              </div>
              <Button className="w-full gap-2"><Send className="h-4 w-4" /> Submit Update</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Compliance heatmap placeholder */}
            <Card className="border-border/50 col-span-full">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold">Submission Heatmap (Last 30 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1">
                  {Array.from({ length: 30 }, (_, i) => {
                    const level = Math.random();
                    return (
                      <div key={i} className={cn("h-4 w-4 rounded-sm", level > 0.8 ? "bg-green-500" : level > 0.5 ? "bg-green-500/60" : level > 0.3 ? "bg-green-500/30" : "bg-accent")} title={`Day ${i + 1}`} />
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                  <span>Less</span>
                  <div className="h-3 w-3 rounded-sm bg-accent" />
                  <div className="h-3 w-3 rounded-sm bg-green-500/30" />
                  <div className="h-3 w-3 rounded-sm bg-green-500/60" />
                  <div className="h-3 w-3 rounded-sm bg-green-500" />
                  <span>More</span>
                </div>
              </CardContent>
            </Card>
            {/* Top contributors */}
            <Card className="border-border/50">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Top Contributors</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {employees.sort((a, b) => b.streak - a.streak).slice(0, 5).map((emp, i) => (
                  <div key={emp.id} className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-4">{i + 1}.</span>
                    <Avatar className="h-5 w-5"><AvatarFallback className="text-[8px] bg-primary/10">{emp.avatar}</AvatarFallback></Avatar>
                    <span className="text-xs font-medium flex-1 truncate">{emp.name}</span>
                    <div className="flex items-center gap-1">
                      <Flame className="h-3 w-3 text-orange-500" />
                      <span className="text-xs font-medium">{emp.streak}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            {/* Pending today */}
            <Card className="border-border/50">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold flex items-center gap-2">Not Submitted <Badge variant="secondary" className="text-[10px] bg-red-500/10 text-red-500 border-0">{total - submitted}</Badge></CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {employees.filter(e => !dailyUpdates.find(d => d.user === e.id)).slice(0, 5).map(emp => (
                  <div key={emp.id} className="flex items-center gap-2">
                    <Avatar className="h-5 w-5"><AvatarFallback className="text-[8px] bg-primary/10">{emp.avatar}</AvatarFallback></Avatar>
                    <span className="text-xs flex-1 truncate">{emp.name}</span>
                    <Badge variant="secondary" className="text-[9px]">{emp.team}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
            {/* Team compliance */}
            <Card className="border-border/50">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold">Team Compliance</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {["Backend", "Frontend", "Design", "AI", "Product"].map(team => {
                  const rate = Math.floor(Math.random() * 40 + 60);
                  return (
                    <div key={team} className="flex items-center gap-2">
                      <span className="text-xs w-16 truncate">{team}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-accent overflow-hidden">
                        <div className="h-full rounded-full bg-green-500" style={{ width: `${rate}%` }} />
                      </div>
                      <span className="text-[10px] font-medium w-8 text-right">{rate}%</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

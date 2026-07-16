// ── Mock Data for Team Operations Platform ──

export const employees = [
  { id: "e1", name: "Arjun Mehta", role: "Engineering Lead", team: "Backend", avatar: "AM", email: "arjun@panthar.io", status: "online", skills: ["Go", "Rust", "PostgreSQL"], streak: 14, productivity: 94 },
  { id: "e2", name: "Priya Sharma", role: "Senior Frontend Engineer", team: "Frontend", avatar: "PS", email: "priya@panthar.io", status: "online", skills: ["React", "TypeScript", "Next.js"], streak: 21, productivity: 97 },
  { id: "e3", name: "Rahul Verma", role: "Product Manager", team: "Product", avatar: "RV", email: "rahul@panthar.io", status: "away", skills: ["Strategy", "Analytics", "Figma"], streak: 7, productivity: 88 },
  { id: "e4", name: "Sneha Patel", role: "UX Designer", team: "Design", avatar: "SP", email: "sneha@panthar.io", status: "online", skills: ["Figma", "Prototyping", "Research"], streak: 18, productivity: 91 },
  { id: "e5", name: "Vikram Singh", role: "DevOps Engineer", team: "Infrastructure", avatar: "VS", email: "vikram@panthar.io", status: "offline", skills: ["Kubernetes", "AWS", "Terraform"], streak: 3, productivity: 85 },
  { id: "e6", name: "Ananya Gupta", role: "Backend Engineer", team: "Backend", avatar: "AG", email: "ananya@panthar.io", status: "online", skills: ["Node.js", "Python", "MongoDB"], streak: 11, productivity: 92 },
  { id: "e7", name: "Karan Joshi", role: "ML Engineer", team: "AI", avatar: "KJ", email: "karan@panthar.io", status: "online", skills: ["PyTorch", "Python", "MLOps"], streak: 9, productivity: 89 },
  { id: "e8", name: "Meera Reddy", role: "QA Lead", team: "Quality", avatar: "MR", email: "meera@panthar.io", status: "away", skills: ["Cypress", "Jest", "Playwright"], streak: 16, productivity: 93 },
  { id: "e9", name: "Aditya Nair", role: "Full Stack Engineer", team: "Frontend", avatar: "AN", email: "aditya@panthar.io", status: "online", skills: ["React", "Go", "GraphQL"], streak: 5, productivity: 87 },
  { id: "e10", name: "Divya Krishnan", role: "Data Analyst", team: "Product", avatar: "DK", email: "divya@panthar.io", status: "online", skills: ["SQL", "Python", "Tableau"], streak: 12, productivity: 90 },
  { id: "e11", name: "Rohan Desai", role: "Mobile Engineer", team: "Frontend", avatar: "RD", email: "rohan@panthar.io", status: "offline", skills: ["React Native", "Swift", "Kotlin"], streak: 8, productivity: 86 },
  { id: "e12", name: "Ishita Kapoor", role: "Technical Writer", team: "Product", avatar: "IK", email: "ishita@panthar.io", status: "online", skills: ["Documentation", "API Specs", "Markdown"], streak: 22, productivity: 95 },
];

export const projects = [
  { id: "p1", name: "Panthar Platform v3", status: "active", progress: 72, health: "good", team: "Backend", lead: "e1", budget: 240000, spent: 168000, startDate: "2025-01-15", endDate: "2025-08-30", members: ["e1", "e6", "e9"], priority: "critical", description: "Complete platform rewrite with microservices architecture" },
  { id: "p2", name: "Design System 2.0", status: "active", progress: 85, health: "good", team: "Design", lead: "e4", budget: 80000, spent: 64000, startDate: "2025-02-01", endDate: "2025-06-15", members: ["e4", "e2"], priority: "high", description: "Unified design system with component library" },
  { id: "p3", name: "AI Analytics Engine", status: "active", progress: 45, health: "at-risk", team: "AI", lead: "e7", budget: 320000, spent: 192000, startDate: "2025-03-01", endDate: "2025-12-31", members: ["e7", "e10"], priority: "high", description: "ML-powered analytics and insights platform" },
  { id: "p4", name: "Mobile App Redesign", status: "active", progress: 38, health: "good", team: "Frontend", lead: "e2", budget: 150000, spent: 57000, startDate: "2025-04-01", endDate: "2025-09-30", members: ["e2", "e11", "e4"], priority: "medium", description: "Complete mobile experience overhaul" },
  { id: "p5", name: "Infrastructure Migration", status: "delayed", progress: 28, health: "critical", team: "Infrastructure", lead: "e5", budget: 200000, spent: 96000, startDate: "2025-01-01", endDate: "2025-07-31", members: ["e5", "e1"], priority: "critical", description: "Migration from AWS to multi-cloud architecture" },
  { id: "p6", name: "API Gateway v2", status: "completed", progress: 100, health: "good", team: "Backend", lead: "e6", budget: 120000, spent: 108000, startDate: "2024-10-01", endDate: "2025-04-30", members: ["e6", "e9"], priority: "high", description: "Next-gen API gateway with rate limiting" },
];

export const tasks = [
  { id: "t1", title: "Implement user authentication flow", project: "p1", assignee: "e1", status: "in-progress", priority: "critical", labels: ["backend", "security"], dueDate: "2025-07-20", storyPoints: 8, comments: 12 },
  { id: "t2", title: "Design onboarding screens", project: "p4", assignee: "e4", status: "review", priority: "high", labels: ["design", "ux"], dueDate: "2025-07-18", storyPoints: 5, comments: 8 },
  { id: "t3", title: "Set up CI/CD pipeline", project: "p5", assignee: "e5", status: "in-progress", priority: "critical", labels: ["devops", "infrastructure"], dueDate: "2025-07-22", storyPoints: 13, comments: 6 },
  { id: "t4", title: "Build chart components", project: "p2", assignee: "e2", status: "done", priority: "medium", labels: ["frontend", "components"], dueDate: "2025-07-15", storyPoints: 5, comments: 4 },
  { id: "t5", title: "Train recommendation model", project: "p3", assignee: "e7", status: "in-progress", priority: "high", labels: ["ml", "data"], dueDate: "2025-07-25", storyPoints: 21, comments: 15 },
  { id: "t6", title: "Write API documentation", project: "p6", assignee: "e12", status: "todo", priority: "medium", labels: ["docs", "api"], dueDate: "2025-07-19", storyPoints: 3, comments: 2 },
  { id: "t7", title: "Database schema optimization", project: "p1", assignee: "e6", status: "backlog", priority: "high", labels: ["backend", "performance"], dueDate: "2025-07-28", storyPoints: 8, comments: 3 },
  { id: "t8", title: "E2E test suite for checkout", project: "p1", assignee: "e8", status: "testing", priority: "high", labels: ["qa", "testing"], dueDate: "2025-07-21", storyPoints: 8, comments: 7 },
  { id: "t9", title: "Implement push notifications", project: "p4", assignee: "e11", status: "todo", priority: "medium", labels: ["mobile", "backend"], dueDate: "2025-07-24", storyPoints: 5, comments: 1 },
  { id: "t10", title: "Data pipeline for analytics", project: "p3", assignee: "e10", status: "in-progress", priority: "high", labels: ["data", "pipeline"], dueDate: "2025-07-23", storyPoints: 13, comments: 9 },
];

export const teams = [
  { id: "tm1", name: "Backend", lead: "e1", members: ["e1", "e6", "e9"], velocity: 42, capacity: 85, color: "#006bff" },
  { id: "tm2", name: "Frontend", lead: "e2", members: ["e2", "e11", "e9"], velocity: 38, capacity: 78, color: "#a000f8" },
  { id: "tm3", name: "Design", lead: "e4", members: ["e4"], velocity: 24, capacity: 90, color: "#f22782" },
  { id: "tm4", name: "AI", lead: "e7", members: ["e7", "e10"], velocity: 31, capacity: 72, color: "#00ac96" },
  { id: "tm5", name: "Infrastructure", lead: "e5", members: ["e5"], velocity: 18, capacity: 65, color: "#ff9300" },
  { id: "tm6", name: "Quality", lead: "e8", members: ["e8"], velocity: 22, capacity: 82, color: "#28a948" },
  { id: "tm7", name: "Product", lead: "e3", members: ["e3", "e10", "e12"], velocity: 28, capacity: 88, color: "#ffa600" },
];

export const activityFeed = [
  { id: "a1", type: "task_assigned", user: "e1", target: "Implement auth flow", project: "Panthar Platform v3", time: "2 min ago", icon: "task" },
  { id: "a2", type: "pr_created", user: "e2", target: "feat: Add chart components", project: "Design System 2.0", time: "15 min ago", icon: "git" },
  { id: "a3", type: "design_uploaded", user: "e4", target: "Onboarding flow v3", project: "Mobile App Redesign", time: "32 min ago", icon: "design" },
  { id: "a4", type: "sprint_started", user: "e3", target: "Sprint 14", project: "AI Analytics Engine", time: "1 hr ago", icon: "sprint" },
  { id: "a5", type: "update_submitted", user: "e6", target: "Daily standup", project: "Panthar Platform v3", time: "2 hr ago", icon: "update" },
  { id: "a6", type: "project_created", user: "e3", target: "Q3 Roadmap Planning", project: "Product", time: "3 hr ago", icon: "project" },
  { id: "a7", type: "employee_joined", user: "e12", target: "Technical Writer", project: "Product", time: "5 hr ago", icon: "user" },
  { id: "a8", type: "deadline_extended", user: "e5", target: "Infrastructure Migration", project: "Infrastructure Migration", time: "6 hr ago", icon: "calendar" },
  { id: "a9", type: "review_completed", user: "e8", target: "Payment flow tests", project: "Panthar Platform v3", time: "8 hr ago", icon: "review" },
  { id: "a10", type: "release_published", user: "e1", target: "v2.4.1", project: "API Gateway v2", time: "1 day ago", icon: "release" },
];

export const dailyUpdates = [
  { id: "du1", user: "e2", date: "2025-07-15", accomplished: "Completed chart component library with 12 variants. Fixed responsive issues on dashboard cards.", tasks: ["t4"], progress: 100, blockers: "None", plan: "Start mobile nav implementation", mood: "productive", reactions: 8, comments: 3 },
  { id: "du2", user: "e1", date: "2025-07-15", accomplished: "Implemented JWT refresh token rotation. Code review for 3 PRs.", tasks: ["t1"], progress: 65, blockers: "Waiting on security audit results", plan: "Complete OAuth2 integration", mood: "focused", reactions: 5, comments: 2 },
  { id: "du3", user: "e7", date: "2025-07-15", accomplished: "Trained v3 recommendation model. Accuracy improved by 4.2%.", tasks: ["t5"], progress: 52, blockers: "GPU cluster at 90% capacity", plan: "Hyperparameter tuning", mood: "excited", reactions: 12, comments: 7 },
  { id: "du4", user: "e4", date: "2025-07-15", accomplished: "Finalized onboarding screen designs. Created 8 component variants.", tasks: ["t2"], progress: 90, blockers: "Need copy review from marketing", plan: "Design review with stakeholders", mood: "creative", reactions: 15, comments: 5 },
  { id: "du5", user: "e6", date: "2025-07-15", accomplished: "Optimized database queries, reduced p99 latency by 40ms.", tasks: ["t7"], progress: 30, blockers: "None", plan: "Continue index optimization", mood: "productive", reactions: 9, comments: 4 },
  
  // Previous Day (Jul 14)
  { id: "du6", user: "e1", date: "2025-07-14", accomplished: "Started JWT implementation. Set up Redis store for sessions.", tasks: ["t1"], progress: 40, blockers: "None", plan: "Finish refresh token rotation.", mood: "productive", reactions: 4, comments: 1 },
  { id: "du7", user: "e2", date: "2025-07-14", accomplished: "Chart components 50% done. Setup recharts wrappers.", tasks: ["t4"], progress: 50, blockers: "None", plan: "Finish variants and responsive styling.", mood: "focused", reactions: 6, comments: 0 },
  { id: "du8", user: "e5", date: "2025-07-14", accomplished: "Configured multi-region AWS VPCs.", tasks: ["t3"], progress: 20, blockers: "Waiting for IAM approvals from security.", plan: "Setup Terraform modules for EKS.", mood: "focused", reactions: 3, comments: 2 },
  
  // Two Days Ago (Jul 13)
  { id: "du9", user: "e4", date: "2025-07-13", accomplished: "Initial wireframes for onboarding.", tasks: ["t2"], progress: 40, blockers: "Need user research data.", plan: "Hi-fidelity mockups.", mood: "creative", reactions: 10, comments: 4 },
  { id: "du10", user: "e11", date: "2025-07-13", accomplished: "Setup push notification certificates.", tasks: ["t9"], progress: 100, blockers: "None", plan: "Start integration with backend.", mood: "productive", reactions: 7, comments: 1 },
];

export const insights = [
  { id: "i1", text: "Backend team completed 96% of sprint goals this week", type: "success", metric: "+12%" },
  { id: "i2", text: "3 projects approaching deadlines within 7 days", type: "warning", metric: "3 projects" },
  { id: "i3", text: "5 employees haven't submitted today's update", type: "alert", metric: "5 pending" },
  { id: "i4", text: "AI team workload is 24% higher than company average", type: "info", metric: "+24%" },
  { id: "i5", text: "Frontend productivity increased by 17% this sprint", type: "success", metric: "+17%" },
  { id: "i6", text: "Design System 2.0 ahead of schedule by 2 weeks", type: "success", metric: "2 weeks" },
];

export const notifications = [
  { id: "n1", title: "Task assigned to you", description: "Implement user authentication flow", category: "tasks", time: "2 min ago", read: false },
  { id: "n2", title: "Priya mentioned you", description: "in Design System component review", category: "mentions", time: "15 min ago", read: false },
  { id: "n3", title: "Sprint 14 started", description: "AI Analytics Engine sprint has begun", category: "releases", time: "1 hr ago", read: false },
  { id: "n4", title: "Review requested", description: "PR #847: feat: Add chart components", category: "reviews", time: "2 hr ago", read: true },
  { id: "n5", title: "Deadline approaching", description: "Infrastructure Migration due in 5 days", category: "deadlines", time: "3 hr ago", read: true },
  { id: "n6", title: "Daily update reminder", description: "You haven't submitted today's update yet", category: "daily-updates", time: "4 hr ago", read: false },
  { id: "n7", title: "New announcement", description: "Q3 planning meeting scheduled for Friday", category: "announcements", time: "Yesterday", read: true },
];

export const workspaces = [
  { id: "w1", name: "Engineering", icon: "⚡", color: "#006bff" },
  { id: "w2", name: "Design", icon: "🎨", color: "#a000f8" },
  { id: "w3", name: "Product", icon: "📦", color: "#28a948" },
  { id: "w4", name: "Operations", icon: "⚙️", color: "#ff9300" },
  { id: "w5", name: "Marketing", icon: "📣", color: "#f22782" },
  { id: "w6", name: "HR", icon: "👥", color: "#00ac96" },
];

export const chartData = {
  productivity: [
    { week: "W1", value: 72 }, { week: "W2", value: 78 }, { week: "W3", value: 74 },
    { week: "W4", value: 82 }, { week: "W5", value: 86 }, { week: "W6", value: 89 },
    { week: "W7", value: 84 }, { week: "W8", value: 91 },
  ],
  velocity: [
    { sprint: "S9", planned: 45, completed: 38 }, { sprint: "S10", planned: 50, completed: 46 },
    { sprint: "S11", planned: 48, completed: 44 }, { sprint: "S12", planned: 52, completed: 49 },
    { sprint: "S13", planned: 55, completed: 52 }, { sprint: "S14", planned: 50, completed: 42 },
  ],
  teamPerformance: [
    { team: "Backend", score: 94 }, { team: "Frontend", score: 91 },
    { team: "Design", score: 88 }, { team: "AI", score: 82 },
    { team: "Infra", score: 76 }, { team: "QA", score: 90 },
    { team: "Product", score: 86 },
  ],
  taskCompletion: [
    { day: "Mon", completed: 18, created: 12 }, { day: "Tue", completed: 24, created: 15 },
    { day: "Wed", completed: 20, created: 18 }, { day: "Thu", completed: 28, created: 14 },
    { day: "Fri", completed: 32, created: 10 },
  ],
  weeklyActivity: [
    { day: "Mon", commits: 45, prs: 12, reviews: 8 }, { day: "Tue", commits: 52, prs: 15, reviews: 11 },
    { day: "Wed", commits: 38, prs: 9, reviews: 14 }, { day: "Thu", commits: 61, prs: 18, reviews: 16 },
    { day: "Fri", commits: 55, prs: 14, reviews: 12 },
  ],
};

export const kanbanColumns = [
  { id: "backlog", title: "Backlog", tasks: tasks.filter(t => t.status === "backlog") },
  { id: "todo", title: "Todo", tasks: tasks.filter(t => t.status === "todo") },
  { id: "in-progress", title: "In Progress", tasks: tasks.filter(t => t.status === "in-progress") },
  { id: "review", title: "Review", tasks: tasks.filter(t => t.status === "review") },
  { id: "testing", title: "Testing", tasks: tasks.filter(t => t.status === "testing") },
  { id: "done", title: "Done", tasks: tasks.filter(t => t.status === "done") },
];

export const todayAgenda = [
  { id: "ag1", type: "meeting", title: "Daily Standup", time: "09:00 AM", duration: "15 min", attendees: 8 },
  { id: "ag2", type: "deadline", title: "Design System Review", time: "11:00 AM", duration: "1 hr", attendees: 4 },
  { id: "ag3", type: "review", title: "PR Review: Auth Flow", time: "02:00 PM", duration: "30 min", attendees: 3 },
  { id: "ag4", type: "standup", title: "Sprint Retrospective", time: "03:30 PM", duration: "45 min", attendees: 12 },
  { id: "ag5", type: "release", title: "v2.5.0 Deployment", time: "05:00 PM", duration: "2 hr", attendees: 5 },
];

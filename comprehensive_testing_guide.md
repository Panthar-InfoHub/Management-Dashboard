# Panthar InfoHub - Comprehensive RBAC Testing Guide

This document outlines the testing parameters, conditions, and tasks required to thoroughly validate the dynamic permissions and role-based access control (RBAC) implementation across the Panthar InfoHub platform.

## 1. System Architecture Overview

The system now relies on a hybrid authorization model:
1.  **Global Dynamic Permissions:** Assigned to roles via the database (e.g., `task:create`, `team:update`). If a user holds this permission globally, they can perform the action on *any* entity.
2.  **Contextual Bypass (Ownership):** If a user lacks the global permission, they are still authorized if they have direct ownership/association (e.g., they are the `leadId` of a project/team, or they are an `assignee` of a task).

## 2. Test Personas

To test effectively, you need at least three test accounts in Clerk, mapped to the following internal roles:
*   **Persona A (Admin):** Has all global permissions (CRUD for everything).
*   **Persona B (Manager):** Has selective permissions (e.g., can create projects and teams, update any task, but cannot delete projects).
*   **Persona C (Employee):** Has zero global update/delete permissions (e.g., no `task:update`, no `project:update`).

## 3. Testing Parameters & Execution Matrix

### A. Team Management
**Goal:** Ensure only global admins or team leads can modify/delete teams.
*   [ ] **Action:** Create a Team
    *   *Persona A/B (Has `team:create`):* Success.
    *   *Persona C (No `team:create`):* Button should be hidden. API should reject with "You do not have permission".
*   [ ] **Action:** Update Team Details / Members
    *   *Persona A (Global `team:update`):* Success on any team.
    *   *Persona C (No global `team:update`):* 
        *   If Persona C is `leadId` of Team X: Success on Team X.
        *   If Persona C is NOT `leadId` of Team Y: Failure. UI should hide edit buttons. API should reject.
*   [ ] **Action:** Delete Team
    *   *Persona A:* Success.
    *   *Condition:* Try deleting a team that has active projects. Verify the system catches the `P2003` cascade error and gracefully shows a toast.

### B. Project Management
**Goal:** Ensure projects are managed by global admins or specific project leads.
*   [ ] **Action:** Update Project Details / Members / Status
    *   *Persona A (Global `project:update`):* Success on any project.
    *   *Persona C (No global `project:update`):* 
        *   If Persona C is `leadId` of Project X: Success on Project X.
        *   If Persona C is just a member (not lead) of Project Y: Failure.
*   [ ] **Action:** Delete Project
    *   *Persona A:* Success. Verify tasks belonging to the project are cascade-deleted correctly.

### C. Task Management (The Core Edge Cases)
**Goal:** Verify users can interact with their own work, but cannot tamper with others' work.
*   [ ] **Action:** Update Task Status / Priority / Details
    *   *Persona A (Global `task:update`):* Success anywhere.
    *   *Persona C (No global `task:update`):*
        *   If assigned to Task X: Success.
        *   If member of Project X (but not assigned to Task X): Success (Project members can help manage tasks in their project).
        *   If completely unrelated to Project/Task: Failure. API rejects.
*   [ ] **Action (Edge Case):** Cross-Project Assignment
    *   *Scenario:* A user is assigned to a specific task within a project, but the user is NOT a member of the project team itself (intentional design).
    *   *Validation:* Log in as this user. Verify the task appears on their personal Dashboard and Kanban board. Verify they can open the task and change its status to "DONE" successfully.
*   [ ] **Action:** Create Subtasks
    *   *Validation:* Regular employees should only be able to create subtasks on parent tasks they are already authorized to view/edit (i.e., they are in the project or assigned).

### D. Settings & Administration
**Goal:** Validate that the Settings page is secure and static administration tools are restricted.
*   [ ] **Action:** View Settings Page
    *   *Persona A (Admin):* Should see the "Settings" tab in the bottom of the sidebar. Can access `/settings` and modify roles.
    *   *Persona B & C:* Should NOT see the "Settings" tab in the sidebar. Navigating directly to `/settings` should trigger a redirect back to `/` (Dashboard).
*   [ ] **Action:** Modify Role Permissions
    *   *Validation:* Only Admins can modify the permissions of roles. Removing `task:create` from a role should immediately hide the "Create Task" button for all users in that role upon their next refresh.

## 4. UI Error Handling Verification
*   [ ] Tamper with a network request using Browser DevTools (e.g., attempt to fire `updateTaskStatusAction` for a task you don't own).
*   [ ] **Expected Result:** The application should NOT crash. The UI state should revert to its previous visual state (e.g., Kanban card snaps back), and a red toast notification MUST explicitly say: `"You do not have permission for this action."`

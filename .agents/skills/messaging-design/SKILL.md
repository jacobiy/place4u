---
name: messaging-design
description: Complete design system, UI/UX patterns, real-time protocols, and component specifications for high-craft chat and messaging interfaces across multi-role dashboards (Admin, Agent, Landlord, Tenant).
version: "1.0.0"
metadata:
  author: AgentSkills
  source: github.com/agentskills/messaging-design
---

# Messaging & Chat Interface Design System

A comprehensive specification and design pattern playbook for engineering enterprise-grade, responsive, and aesthetically polished real-time messaging systems across multi-role real estate dashboards.

---

## 1. Visual Hierarchy & Architecture

### Layout Geometry
1. **Three-Column Desktop Layout (or Collapsible 2-Column)**:
   - **Column 1: Conversations List / Channels** (`w-72` to `w-84`, fixed width or min/max responsive clamp).
     - Search bar with instant fuzzy filtering.
     - Role / Status filter pills (`All`, `Tenants`, `Landlords`, `Agents`, `Admin`, `Unread`).
     - Conversation item card with avatar, presence indicator, contact name, role badge, last message preview, unread count badge, and relative timestamp.
   - **Column 2: Active Chat Conversation View** (`flex-1`).
     - Persistent sticky chat header with recipient avatar, role badge, online status, quick action buttons (Call, Video, View Profile, Property Link).
     - Scrollable message viewport (`overflow-y-auto`) with date separators, message groups, and scroll-to-bottom anchor.
     - Sticky bottom message composer with multiline auto-expand input, attachment picker, emoji trigger, quick suggestion chips, and send button.
   - **Column 3 (Context Drawer / Details View)**:
     - Collapsible side panel showing property association, lease details, contact card, shared documents, and quick real-estate actions (e.g., Schedule Inspection, Create Lease Draft, Payment Reminder).

2. **Mobile / Narrow Screen Responsive Handling**:
   - Single-view drilldown: when a conversation is selected on mobile, full width shifts to conversation view with a prominent "Back to conversations" chevron button.

---

## 2. Component Design Specifications

### 2.1 Thread Item Card
- **Normal state**: Subtle hover elevation (`hover:bg-slate-800/50` or `hover:bg-slate-100`).
- **Active / Selected state**: Distinct active background accent (`bg-blue-600/10 border-l-4 border-blue-500` or solid primary container).
- **Typography**:
  - Name: `font-semibold text-sm truncate`.
  - Preview: `text-xs text-muted truncate` (bold if unread).
  - Time: `text-[11px] text-muted whitespace-nowrap ml-auto`.
- **Badges**:
  - Role pill: `text-[10px] px-2 py-0.5 rounded-full font-medium` (e.g. Blue for Agent, Amber for Landlord, Emerald for Tenant, Purple for Admin).
  - Unread badge: High-contrast pill `bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full`.

### 2.2 Message Bubbles
- **Outgoing (Current User)**:
  - Placement: Right aligned (`ml-auto flex-row-reverse`).
  - Palette: Primary brand fill (e.g. `bg-blue-600 text-white`), rounded corners with smaller radius on bottom-right (`rounded-2xl rounded-br-xs`).
  - Meta: Timestamp with double-check status mark (✓ sent, ✓✓ delivered/read).
- **Incoming (Counterparty)**:
  - Placement: Left aligned (`mr-auto flex-row`).
  - Palette: Neutral surface (e.g. dark mode `bg-slate-800 text-slate-100 border border-slate-700/60`, light mode `bg-white text-slate-900 border border-slate-200`), rounded corners with smaller radius on bottom-left (`rounded-2xl rounded-bl-xs`).
  - Sender label: Mini bold name badge when in multi-party or admin context.

### 2.3 Date Dividers & System Events
- Centered badge with subtle hairline divider:
  - `Today`, `Yesterday`, or formatted date `Friday, 12 Oct 2026`.
  - System event pill (e.g., "Lease inquiry created for Sandton Penthouse").

### 2.4 Quick Real Estate Action Prompts
- Interactive chips above or inside the composer:
  - *"Request Property Viewing"*
  - *"Inquire on Lease Agreement"*
  - *"Send Maintenance Update"*
  - *"Payment Confirmation"*

### 2.5 Message Composer
- **Input Field**:
  - Resizable or flexible textarea handling `Enter` to send, `Shift+Enter` for new line.
  - Clear placeholder with counterparty context (`"Type a message to Thabo..."`).
- **Action Toolbar**:
  - Media/file upload button (image, PDF lease documents, receipts).
  - Quick Emoji picker toggle.
  - Send button with active state transform (disabled when empty, illuminated when populated).

---

## 3. Real-Time & State Synchronization Guidelines

1. **Optimistic Updates**:
   - Immediately append outgoing message to local state with `status: 'sending'`.
   - Update message status to `'sent'` upon database confirmation.
   - Graceful fallback with retry button on failure.

2. **Supabase Realtime Channel**:
   - Listen to `postgres_changes` on `messages` table filtered by `receiver_id` or conversation id.
   - Automatically trigger scroll to bottom when a new incoming message arrives.
   - Keep contact list last-message snippet and timestamp updated in real time.

3. **Fallback & Offline Resilience**:
   - Resilient database query fallbacks with rich mock seeds for rapid verification and uninterrupted workflow.
   - Clear empty states with call-to-action buttons ("Start a conversation").

---

## 4. Accessibility & Micro-Interactions

- High contrast text (`WCAG AA` 4.5:1 ratio minimum).
- Clear `:focus-visible` ring on composer and interactive buttons.
- Smooth scrolling on new messages (`scroll-smooth` or `requestAnimationFrame`).
- Sound or badge cues for new unread notifications.

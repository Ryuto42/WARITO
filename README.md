# WARITO — University Timetable Manager

**WARITO** is a modern web app for managing your university timetable.  
Paste syllabus text to auto-extract course info, or add classes manually — all in a sleek dark-mode interface.

## ✨ Features

- **Syllabus Auto-Parse** — Paste syllabus text to automatically extract course name, faculty, day/period, instructor, evaluation criteria, and more
- **Dark & Light Mode** — Sleek default dark theme with a toggleable light mode, featuring liquid glass animations
- **PWA Support** — Install WARITO as a native app on your home screen or desktop
- **Dynamic Island** — Modern top-floating pill for effortless term and year switching
- **Faculty Color Sync** — Courses from the same faculty/department are automatically assigned the same color
- **Responsive Layout** — Split-view for conflicting periods and adjusted dimensions for mobile
- **Evaluation Pie Chart** — Visualize grading criteria extracted from syllabi
- **Customizable Grid** — Toggle Saturday, set period count (1–7), and configure time slots per period using collapsable menus

## 🛠 Tech Stack

| Category | Technology |
|---|---|
| Frontend | React 19 + TypeScript |
| Styling | Tailwind CSS 3 |
| Build Tool | Vite 8 |
| Backend / Auth / DB | Supabase (PostgreSQL) |

## 📖 Usage

### Sign Up / Login

1. Create an account with your email and password
2. Click the verification link in the confirmation email
3. Log in to access your timetable

### Adding a Course

1. Tap the **+ button** at the bottom-right
2. Copy text from your university's syllabus page and paste it into the text area
3. Course name, faculty, and other details are auto-filled (manual edits won't be overwritten blindly)
4. Adjust the color if needed and tap **Save**

### Switching Terms

- Tap the **"20XX \| Semester"** Dynamic Island button at the top of the screen
- Select the year (2023-2030) and semester, then tap **Apply**

### Settings (Account Tab)

- **Appearance** — Toggle between Light and Dark mode
- **Saturday display** — Toggle ON/OFF
- **Period count** — Choose from 1–7
- **Time slots** — Collapse/expand and set start/end times for each period
- **Faculty colors** — Bulk-change course colors by faculty/department

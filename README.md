# WARITO — University Timetable Manager

**WARITO** is a modern web app for managing your university timetable.  
Paste syllabus text to auto-extract course info, or add classes manually — all in a sleek dark-mode interface.

## ✨ Features

- **Syllabus Auto-Parse** — Paste syllabus text to automatically extract course name, classroom, day/period, instructor, evaluation criteria, and more
- **Dark Mode UI** — Premium dark theme with Glassmorphism / Liquid Glass design and smooth animations
- **Term & Year Switching** — Manage multiple semesters and academic years
- **Faculty Color Sync** — Courses from the same faculty/department are automatically assigned the same color
- **Evaluation Pie Chart** — Visualize grading criteria extracted from syllabi
- **Customizable Grid** — Toggle Saturday, set period count (1–7), and configure time slots per period
- **Responsive** — Works on both mobile and desktop

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
3. Course name, classroom, and other details are auto-filled
4. Adjust the color if needed and tap **Save**

### Switching Terms

- Tap the **"20XX | Semester"** button at the bottom of the screen
- Select the year and semester, then tap **Apply**

### Settings (Account Tab)

- **Saturday display** — Toggle ON/OFF
- **Period count** — Choose from 1–7
- **Time slots** — Set start/end times for each period
- **Faculty colors** — Bulk-change course colors by faculty/department

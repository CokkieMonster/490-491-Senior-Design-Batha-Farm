# One-off document tools (reference)

- `build_deck_29oct.js`: pptxgenjs script that built *PTZ Progress – Advisor Meeting 29 Oct* (needs the
  images it references and a theme helper that was local to the build machine; kept to show the content and layout).
- `build_todo_docx.js`: docx script that built *To-do list before the 5 Nov meeting* from task JSON files.
- `report_tracked_edits.py`: applied the 29 Oct updates to the SDP report XML as Word tracked changes
  (`python report_tracked_edits.py word/document.xml [--clean]`).

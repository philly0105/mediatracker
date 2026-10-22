Pill text field (and textarea) used across login, search, and the edit-entry modal.

```jsx
<Input placeholder="Email" type="email" />
<Input icon="search" placeholder="Search movies and TV shows..." />
<Input multiline rows={4} placeholder="Write your thoughts..." />
```

Border brightens to 30% white on focus. Use `multiline` for the review/notes field (becomes a rounded-2xl textarea). Leading `icon` is a Lucide name, single-line only.

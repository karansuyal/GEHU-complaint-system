// "Good morning / afternoon / evening" in the viewer's local time.
export default function useGreeting() {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
}

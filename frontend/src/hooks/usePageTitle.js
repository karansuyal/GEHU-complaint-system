import { useEffect } from 'react'

// Sets the browser tab title (also what screen readers announce on navigation).
export default function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · GEHU Complaints` : 'GEHU Bhimtal | Complaint Portal'
  }, [title])
}

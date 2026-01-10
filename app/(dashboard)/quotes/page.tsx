import { redirect } from 'next/navigation';

export default function QuotesPage() {
  redirect('/documents?tab=quotes');
}

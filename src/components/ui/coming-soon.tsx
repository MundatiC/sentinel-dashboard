import { Card, PageHeader } from './card';

export function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <Card className="text-on-surface-variant">This page is built in a later step.</Card>
    </>
  );
}

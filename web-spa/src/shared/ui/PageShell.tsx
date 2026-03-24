import { motion } from 'framer-motion';
import { PropsWithChildren } from 'react';

type PageShellProps = PropsWithChildren<{
  title: string;
  description: string;
}>;

export function PageShell({ title, description, children }: PageShellProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="tab-content animate-fade-in"
    >
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">{title}</h2>
        <p className="text-slate-600 dark:text-slate-400 mt-2">{description}</p>
      </div>
      <div className="card p-6">{children}</div>
    </motion.section>
  );
}

import { ReactNode } from "react";

interface PageLayoutProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}

export function PageLayout({
  title,
  subtitle,
  children,
  className = "",
}: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-gray-50 dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        {(title || subtitle) && (
          <div className="mb-8">
            {title && (
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-lg text-gray-600 dark:text-gray-400">
                {subtitle}
              </p>
            )}
          </div>
        )}

        {/* Page Content */}
        <div className={className}>
          {children}
        </div>
      </div>
    </div>
  );
}

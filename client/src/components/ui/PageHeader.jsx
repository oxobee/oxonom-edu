import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export const PageHeader = ({
  title,
  description,
  breadcrumbs = [],
  backTo,
  badge,
  actions,
  className = '',
}) => {
  const navigate = useNavigate();

  return (
    <div className={`mb-6 sm:mb-8 flex flex-col gap-4 sm:gap-6 ${className}`}>
      {/* Breadcrumb or Back Button */}
      {(backTo || breadcrumbs.length > 0) && (
        <div className="flex items-center gap-2 text-xs text-slate-400">
          {backTo && (
            <button
              onClick={() => (typeof backTo === 'string' ? navigate(backTo) : navigate(-1))}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Geri Dön</span>
            </button>
          )}

          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="text-slate-600">/</span>}
              {crumb.path ? (
                <button
                  onClick={() => navigate(crumb.path)}
                  className="hover:text-slate-200 transition-colors cursor-pointer"
                >
                  {crumb.label}
                </button>
              ) : (
                <span className="text-slate-200 font-medium">{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* Main Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-slate-100 tracking-tight">
              {title}
            </h1>
            {badge && <div>{badge}</div>}
          </div>
          {description && (
            <p className="mt-1 text-xs sm:text-sm text-slate-400 max-w-3xl">
              {description}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default PageHeader;

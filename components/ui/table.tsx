import * as React from 'react';

interface TableProps extends React.HTMLAttributes<HTMLTableElement> {}

export function Table({ className = '', ...props }: TableProps) {
  return (
    <div className="relative w-full overflow-auto">
      <table
        className={`w-full caption-bottom text-sm ${className}`}
        {...props}
      />
    </div>
  );
}

interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {}

export function TableHeader({ className = '', ...props }: TableHeaderProps) {
  return <thead className={`[&_tr]:border-b ${className}`} {...props} />;
}

interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {}

export function TableBody({ className = '', ...props }: TableBodyProps) {
  return <tbody className={`[&_tr:last-child]:border-0 ${className}`} {...props} />;
}

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {}

export function TableRow({ className = '', ...props }: TableRowProps) {
  return (
    <tr
      className={`border-b transition-colors hover:bg-gray-50 data-[state=selected]:bg-gray-50 ${className}`}
      {...props}
    />
  );
}

interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {}

export function TableHead({ className = '', ...props }: TableHeadProps) {
  return (
    <th
      className={`h-12 px-4 text-left align-middle font-medium text-gray-500 [&:has([role=checkbox])]:pr-0 ${className}`}
      {...props}
    />
  );
}

interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {}

export function TableCell({ className = '', ...props }: TableCellProps) {
  return (
    <td
      className={`p-4 align-middle text-gray-900 [&:has([role=checkbox])]:pr-0 ${className}`}
      {...props}
    />
  );
}

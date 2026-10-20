import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useIsMobile } from '@/hooks/useMediaQuery';
import type { TableState } from '@/hooks/useTableState';
import { Button } from './Button';
import { EmptyState, TableSkeleton } from './States';

export interface Column<T> {
  /** Stable key; also the sort key when `sortable` is set. */
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  sortable?: boolean;
  /** Right-align numeric columns. */
  align?: 'left' | 'right' | 'center';
  className?: string;
  headerClassName?: string;
  /** Hide below the lg breakpoint, for secondary detail. */
  hideBelowLg?: boolean;
  /** On mobile cards, this column becomes the card's title row. */
  mobilePrimary?: boolean;
  /** Omit entirely from the mobile card view. */
  hideOnMobile?: boolean;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  table: TableState<T>;
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  empty?: { title: string; description?: string; icon?: ReactNode; action?: ReactNode };
  className?: string;
  /** Actions rendered at the right of every row / bottom of every card. */
  rowActions?: (row: T) => ReactNode;
  caption?: string;
}

const ALIGN: Record<NonNullable<Column<unknown>['align']>, string> = {
  left: 'text-left',
  right: 'text-right',
  center: 'text-center',
};

export function DataTable<T>({
  columns,
  table,
  rowKey,
  onRowClick,
  loading,
  empty,
  className,
  rowActions,
  caption,
}: DataTableProps<T>): JSX.Element {
  const isMobile = useIsMobile();

  if (loading) {
    return (
      <div className={cn('card overflow-hidden', className)}>
        <TableSkeleton columns={Math.min(columns.length, 5)} />
      </div>
    );
  }

  if (table.total === 0) {
    return (
      <div className={cn('card', className)}>
        <EmptyState
          title={empty?.title ?? 'Nothing to show'}
          description={empty?.description}
          icon={empty?.icon}
          action={empty?.action}
        />
      </div>
    );
  }

  // Below md a table forces horizontal scrolling, so rows become cards instead.
  if (isMobile) {
    const primary = columns.find((c) => c.mobilePrimary) ?? columns[0]!;
    const rest = columns.filter((c) => c !== primary && !c.hideOnMobile);

    return (
      <div className={cn('space-y-2.5', className)}>
        {table.rows.map((row) => (
          <div
            key={rowKey(row)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={cn('card p-4', onRowClick && 'cursor-pointer active:bg-canvas')}
          >
            <div className="mb-2.5">{primary.render(row)}</div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
              {rest.map((column) => (
                <div key={column.key} className="min-w-0">
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-subtle">
                    {column.header}
                  </dt>
                  <dd className="mt-0.5 truncate text-sm text-ink">{column.render(row)}</dd>
                </div>
              ))}
            </dl>

            {rowActions && (
              <div
                className="mt-3 flex items-center justify-end gap-2 border-t border-line pt-3"
                onClick={(e) => e.stopPropagation()}
              >
                {rowActions(row)}
              </div>
            )}
          </div>
        ))}

        <Pagination table={table} />
      </div>
    );
  }

  return (
    <div className={cn('card overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}

          <thead>
            <tr className="border-b border-line bg-canvas/60">
              {columns.map((column) => {
                const isSorted = table.sortKey === column.key;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={
                      isSorted ? (table.sortDir === 'asc' ? 'ascending' : 'descending') : undefined
                    }
                    className={cn(
                      'px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-subtle whitespace-nowrap',
                      ALIGN[column.align ?? 'left'],
                      column.hideBelowLg && 'hidden lg:table-cell',
                      column.headerClassName,
                    )}
                  >
                    {column.sortable ? (
                      <button
                        type="button"
                        onClick={() => table.toggleSort(column.key)}
                        className={cn(
                          'inline-flex items-center gap-1 transition-colors hover:text-ink',
                          isSorted && 'text-brand',
                          column.align === 'right' && 'flex-row-reverse',
                        )}
                      >
                        {column.header}
                        {isSorted ? (
                          table.sortDir === 'asc' ? (
                            <ArrowUp className="h-3 w-3" aria-hidden />
                          ) : (
                            <ArrowDown className="h-3 w-3" aria-hidden />
                          )
                        ) : (
                          <ChevronsUpDown className="h-3 w-3 opacity-40" aria-hidden />
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
              {rowActions && <th scope="col" className="w-px px-4 py-3" />}
            </tr>
          </thead>

          <tbody className="divide-y divide-line">
            {table.rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-canvas/70',
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'px-4 py-3 text-ink align-middle',
                      ALIGN[column.align ?? 'left'],
                      column.hideBelowLg && 'hidden lg:table-cell',
                      column.className,
                    )}
                  >
                    {column.render(row)}
                  </td>
                ))}
                {rowActions && (
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    {rowActions(row)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination table={table} bordered />
    </div>
  );
}

export function Pagination<T>({
  table,
  bordered,
}: {
  table: TableState<T>;
  bordered?: boolean;
}): JSX.Element | null {
  // One page of results needs no controls, but the count is still useful.
  if (table.total === 0) return null;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-between gap-3 px-4 py-3 sm:flex-row',
        bordered && 'border-t border-line',
      )}
    >
      <p className="text-xs text-muted">
        Showing <span className="font-medium text-ink tabular-nums">{table.from}</span>–
        <span className="font-medium text-ink tabular-nums">{table.to}</span> of{' '}
        <span className="font-medium text-ink tabular-nums">{table.total}</span>
      </p>

      {table.pageCount > 1 && (
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            aria-label="Previous page"
            disabled={table.page <= 1}
            onClick={() => table.setPage(table.page - 1)}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </Button>

          <span className="px-2 text-xs text-muted tabular-nums">
            Page {table.page} of {table.pageCount}
          </span>

          <Button
            variant="outline"
            size="sm"
            aria-label="Next page"
            disabled={table.page >= table.pageCount}
            onClick={() => table.setPage(table.page + 1)}
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      )}
    </div>
  );
}

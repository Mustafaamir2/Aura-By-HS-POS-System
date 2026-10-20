import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Plus, UserSquare2 } from 'lucide-react';
import { isSameDay, parseISO } from 'date-fns';
import type { Staff } from '@/types';
import { formatCurrency } from '@/utils/money';
import { formatClock, toISODate, WEEKDAY_SHORT } from '@/utils/date';
import { matches } from '@/utils/text';
import type { Weekday } from '@/types';
import { useDb } from '@/hooks/useDb';
import { useShopScope } from '@/hooks/useShopScope';
import { useDebounce } from '@/hooks/useDebounce';
import { useTableState } from '@/hooks/useTableState';
import { performance as staffPerformance } from '@/services/staffService';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SearchBar } from '@/components/ui/SearchBar';
import { FilterBar, FilterSelect } from '@/components/ui/FilterBar';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Avatar } from '@/components/ui/Avatar';
import { Badge, ActiveBadge } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { StaffFormModal } from './StaffFormModal';

export function StaffPage(): JSX.Element {
  const db = useDb();
  const { shopId, isAllShops } = useShopScope();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [role, setRole] = useState('all');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('active');
  const [formOpen, setFormOpen] = useState(false);

  const debounced = useDebounce(search);
  const today = new Date();
  const weekday = today.getDay() as Weekday;
  const isoToday = toISODate(today);

  const performance = useMemo(() => {
    const map = new Map<string, ReturnType<typeof staffPerformance>[number]>();
    staffPerformance(shopId).forEach((row) => map.set(row.staffId, row));
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, shopId]);

  const rows = useMemo(
    () =>
      db.staff.filter((member) => {
        if (shopId !== null && member.shopId !== shopId) return false;
        if (role !== 'all' && member.role !== role) return false;
        if (status === 'active' && !member.active) return false;
        if (status === 'inactive' && member.active) return false;
        if (debounced && !matches(member.name, debounced) && !matches(member.role, debounced)) {
          return false;
        }
        return true;
      }),
    [db.staff, shopId, role, status, debounced],
  );

  const table = useTableState(rows, {
    initialPageSize: 12,
    initialSortKey: 'name',
    accessors: {
      name: (s) => s.name,
      role: (s) => s.role,
      today: (s) => todayCount(s.id),
      revenue: (s) => performance.get(s.id)?.revenue ?? 0,
    },
  });

  function todayCount(staffId: string): number {
    return db.appointments.filter(
      (a) =>
        a.staffId === staffId &&
        isSameDay(parseISO(a.startAt), today) &&
        a.status !== 'cancelled',
    ).length;
  }

  const onDuty = rows.filter(
    (member) =>
      member.active &&
      !member.timeOff.includes(isoToday) &&
      member.schedule.find((s) => s.weekday === weekday)?.working,
  );

  const columns: Column<Staff>[] = [
    {
      key: 'name',
      header: 'Team member',
      sortable: true,
      mobilePrimary: true,
      render: (member) => (
        <div className="flex items-center gap-3">
          <Avatar name={member.name} src={member.photoUrl} size="sm" />
          <div className="min-w-0">
            <p className="flex items-center gap-2 truncate text-sm font-medium text-ink">
              {member.name}
              {!member.active && <Badge tone="neutral">Inactive</Badge>}
            </p>
            <p className="truncate text-xs text-muted">{member.role}</p>
          </div>
        </div>
      ),
    },
    ...(isAllShops
      ? [
          {
            key: 'shop',
            header: 'Branch',
            render: (member: Staff) => (
              <span className="text-sm text-muted">
                {db.shops.find((s) => s.id === member.shopId)?.name ?? '—'}
              </span>
            ),
          } satisfies Column<Staff>,
        ]
      : []),
    {
      key: 'specializations',
      header: 'Specializations',
      hideBelowLg: true,
      render: (member) => (
        <span className="text-sm text-muted">
          {member.specializations.length === 0
            ? 'Not bookable'
            : `${member.specializations.length} services`}
        </span>
      ),
    },
    {
      key: 'hours',
      header: 'Working days',
      hideBelowLg: true,
      render: (member) => (
        <div className="flex gap-0.5">
          {member.schedule.map((shift) => (
            <span
              key={shift.weekday}
              title={
                shift.working
                  ? `${WEEKDAY_SHORT[shift.weekday]}: ${formatClock(shift.start)} – ${formatClock(shift.end)}`
                  : `${WEEKDAY_SHORT[shift.weekday]}: off`
              }
              className={
                shift.working
                  ? 'grid h-5 w-5 place-items-center rounded bg-brand-soft text-[9px] font-medium text-brand'
                  : 'grid h-5 w-5 place-items-center rounded bg-line/60 text-[9px] text-subtle'
              }
            >
              {WEEKDAY_SHORT[shift.weekday].charAt(0)}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'today',
      header: 'Today',
      sortable: true,
      align: 'right',
      render: (member) => {
        const count = todayCount(member.id);
        return (
          <span className="text-sm tabular-nums text-ink">
            {count > 0 ? `${count} booked` : '—'}
          </span>
        );
      },
    },
    {
      key: 'revenue',
      header: 'Revenue',
      sortable: true,
      align: 'right',
      render: (member) => (
        <span className="text-sm font-medium tabular-nums text-ink">
          {formatCurrency(performance.get(member.id)?.revenue ?? 0, { compact: true })}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (member) => <ActiveBadge active={member.active} />,
    },
  ];

  const roles = useMemo(() => [...new Set(db.staff.map((s) => s.role))].sort(), [db.staff]);

  return (
    <>
      <PageHeader
        title="Staff"
        description="Rotas here drive what the booking engine offers, so a schedule change takes effect immediately."
        actions={
          <Button
            leftIcon={<Plus />}
            disabled={shopId === null}
            title={shopId === null ? 'Pick a single branch first' : undefined}
            onClick={() => setFormOpen(true)}
          >
            Add team member
          </Button>
        }
      />

      <div className="mb-4 grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Team members" value={rows.length} icon={<UserSquare2 />} />
        <StatCard label="On duty today" value={onDuty.length} icon={<CalendarDays />} tone="ok" />
        <StatCard
          label="Bookable"
          value={rows.filter((s) => s.active && s.specializations.length > 0).length}
          hint="Qualified for at least one service"
        />
        <StatCard
          label="Commission owed"
          value={formatCurrency(
            rows.reduce((sum, s) => sum + (performance.get(s.id)?.commission ?? 0), 0),
            { compact: true },
          )}
          hint="All time, from completed bills"
        />
      </div>

      <Card className="mb-4">
        <FilterBar
          activeCount={(role !== 'all' ? 1 : 0) + (status !== 'active' ? 1 : 0) + (debounced ? 1 : 0)}
          onClear={() => {
            setSearch('');
            setRole('all');
            setStatus('active');
          }}
        >
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by name or role…"
            className="w-full sm:w-72"
            label="Search staff"
          />

          <FilterSelect
            label="Role"
            value={role}
            onChange={setRole}
            options={[
              { value: 'all', label: 'All roles' },
              ...roles.map((r) => ({ value: r, label: r })),
            ]}
          />

          <FilterSelect
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              { value: 'active', label: 'Active only' },
              { value: 'inactive', label: 'Inactive only' },
              { value: 'all', label: 'All statuses' },
            ]}
          />
        </FilterBar>
      </Card>

      <DataTable
        columns={columns}
        table={table}
        rowKey={(member) => member.id}
        onRowClick={(member) => navigate(`/admin/staff/${member.id}`)}
        caption="Staff"
        empty={{
          title: 'No team members match',
          description: 'Try clearing the filters, or add someone to this branch.',
          icon: <UserSquare2 />,
        }}
      />

      {shopId && (
        <StaffFormModal open={formOpen} onClose={() => setFormOpen(false)} shopId={shopId} />
      )}
    </>
  );
}

export default StaffPage;

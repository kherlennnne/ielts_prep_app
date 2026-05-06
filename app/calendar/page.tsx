"use client";
import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, isToday, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, Trash2, CheckCircle2 } from "lucide-react";
import { useStore, CalendarEvent, EventType } from "@/lib/store";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { generateId, EVENT_DOT, EVENT_COLORS } from "@/lib/utils";
import { cn } from "@/lib/utils";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TYPES: EventType[] = ["study", "test", "review", "break"];

export default function CalendarPage() {
  const { events, addEvent, updateEvent, deleteEvent } = useStore();
  const [current, setCurrent] = useState(new Date());
  const [selected, setSelected] = useState(new Date());
  const [showAdd, setShowAdd] = useState(false);
  const [showDetail, setShowDetail] = useState<CalendarEvent | null>(null);

  const [form, setForm] = useState({ title: "", time: "09:00", duration: 60, type: "study" as EventType, notes: "" });

  const monthStart = startOfMonth(current);
  const monthEnd = endOfMonth(current);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const dayEvents = (d: Date) => events.filter(e => e.date === format(d, "yyyy-MM-dd"));
  const selectedEvents = dayEvents(selected);

  function handleAdd() {
    if (!form.title.trim()) return;
    addEvent({
      id: generateId(), date: format(selected, "yyyy-MM-dd"),
      title: form.title, time: form.time, duration: form.duration,
      type: form.type, completed: false, notes: form.notes,
    });
    setForm({ title: "", time: "09:00", duration: 60, type: "study", notes: "" });
    setShowAdd(false);
  }

  return (
    <div className="min-h-screen">
      <PageHeader title="Calendar" subtitle="Plan your study sessions"
        action={<Button size="sm" onClick={() => setShowAdd(true)}><Plus size={14} /> Add</Button>} />

      <div className="px-4 lg:px-8">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setCurrent(subMonths(current, 1))} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <ChevronLeft size={18} className="text-gray-600" />
          </button>
          <h2 className="text-base font-semibold text-gray-900">{format(current, "MMMM yyyy")}</h2>
          <button onClick={() => setCurrent(addMonths(current, 1))} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <ChevronRight size={18} className="text-gray-600" />
          </button>
        </div>

        {/* Apple-style calendar grid */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-4">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {DAYS.map(d => (
              <div key={d} className="text-center py-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{d}</div>
            ))}
          </div>
          {/* Day cells */}
          <div className="grid grid-cols-7">
            {days.map((day, i) => {
              const evs = dayEvents(day);
              const isSelected = isSameDay(day, selected);
              const isCurrentMonth = isSameMonth(day, current);
              const todayDay = isToday(day);
              return (
                <button key={i} onClick={() => setSelected(day)}
                  className={cn("relative flex flex-col items-center pt-2 pb-1.5 min-h-[52px] transition-colors border-r border-b border-gray-50 last:border-r-0",
                    isSelected ? "bg-accent-lightest" : "hover:bg-gray-50",
                    !isCurrentMonth && "opacity-30")}>
                  <span className={cn("w-7 h-7 flex items-center justify-center rounded-full text-sm leading-none mb-0.5",
                    todayDay && !isSelected ? "bg-accent text-white font-semibold" : "",
                    isSelected && !todayDay ? "bg-accent-darker text-white font-semibold" : "",
                    isSelected && todayDay ? "bg-accent-darker text-white font-semibold" : "",
                    !isSelected && !todayDay ? "text-gray-900" : "")}>
                    {format(day, "d")}
                  </span>
                  {/* Event dots — max 3 */}
                  <div className="flex gap-0.5 justify-center">
                    {evs.slice(0, 3).map((e, idx) => (
                      <div key={idx} className={cn("w-1 h-1 rounded-full", EVENT_DOT[e.type])} />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected day events */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">{isToday(selected) ? "Today" : format(selected, "EEEE, MMM d")}</h3>
            <button onClick={() => setShowAdd(true)} className="text-accent-darker text-sm font-medium">+ Add</button>
          </div>
          {selectedEvents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-6 text-center">
              <p className="text-sm text-gray-400">No sessions — tap + to add one</p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedEvents.sort((a, b) => a.time.localeCompare(b.time)).map(ev => (
                <div key={ev.id} onClick={() => setShowDetail(ev)}
                  className={cn("bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3 cursor-pointer hover:shadow-sm transition-all",
                    ev.completed && "opacity-70")}>
                  <div className={cn("w-1 h-12 rounded-full flex-shrink-0",
                    ev.type === "study" ? "bg-blue-400" : ev.type === "test" ? "bg-red-400" :
                    ev.type === "review" ? "bg-amber-400" : "bg-green-400")} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{ev.title}</p>
                    <p className="text-xs text-gray-500">{ev.time} · {ev.duration} min · <span className="capitalize">{ev.type}</span></p>
                  </div>
                  {ev.completed ? <CheckCircle2 size={18} className="text-green-500 flex-shrink-0" /> :
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />}
                  <button
                    onClick={e => { e.stopPropagation(); deleteEvent(ev.id); }}
                    className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title={`Add Session · ${format(selected, "MMM d")}`}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Title</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Reading Practice"
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Time</label>
              <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Duration (min)</label>
              <input type="number" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: +e.target.value }))}
                min={5} step={5}
                className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</label>
            <div className="mt-1.5 grid grid-cols-4 gap-2">
              {TYPES.map(t => (
                <button key={t} onClick={() => setForm(f => ({ ...f, type: t }))}
                  className={cn("py-2 rounded-xl text-xs font-medium capitalize border transition-all",
                    form.type === t ? EVENT_COLORS[t] : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100")}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Notes (optional)</label>
            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              rows={2} placeholder="Any notes..."
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all resize-none" />
          </div>
          <Button className="w-full" onClick={handleAdd}>Add Session</Button>
        </div>
      </Modal>

      {/* Detail modal */}
      {showDetail && (
        <Modal open={!!showDetail} onClose={() => setShowDetail(null)} title={showDetail.title}>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <span className={cn("px-3 py-1 rounded-full text-xs font-medium border capitalize", EVENT_COLORS[showDetail.type])}>{showDetail.type}</span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{showDetail.time}</span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">{showDetail.duration} min</span>
            </div>
            {showDetail.notes && <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3">{showDetail.notes}</p>}
            <div className="flex gap-2 pt-2">
              <Button variant={showDetail.completed ? "secondary" : "primary"} className="flex-1"
                onClick={() => { updateEvent(showDetail.id, { completed: !showDetail.completed }); setShowDetail(null); }}>
                {showDetail.completed ? "Mark Incomplete" : "Mark Complete"}
              </Button>
              <Button variant="danger" size="md" onClick={() => { deleteEvent(showDetail.id); setShowDetail(null); }}>
                <Trash2 size={15} />
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

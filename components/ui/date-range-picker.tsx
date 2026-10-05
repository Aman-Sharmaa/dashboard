"use client"

import * as React from "react"
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfDay, eachDayOfInterval, getDay, isSameDay, isSameMonth, isWithinInterval, isBefore, isAfter } from "date-fns"
import { ChevronDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export type DateRange = {
  from: Date | undefined
  to: Date | undefined
}

interface DateRangePickerProps {
  value?: DateRange
  onChange?: (range: DateRange) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"]
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

function MonthDropdown({ month, onChange }: { month: Date; onChange: (d: Date) => void }) {
  const [open, setOpen] = React.useState(false)
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-sm font-medium text-foreground hover:text-primary transition-colors"
      >
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        {MONTHS[month.getMonth()]}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border rounded-lg shadow-lg py-1 max-h-48 overflow-y-auto w-32">
          {MONTHS.map((m, i) => (
            <button
              key={m}
              type="button"
              className={cn(
                "w-full text-left px-3 py-1.5 text-sm hover:bg-muted/50 transition-colors",
                i === month.getMonth() && "bg-primary/10 text-primary font-medium"
              )}
              onClick={() => {
                const d = new Date(month)
                d.setMonth(i)
                onChange(d)
                setOpen(false)
              }}
            >
              {m}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function YearDropdown({ month, onChange }: { month: Date; onChange: (d: Date) => void }) {
  const [open, setOpen] = React.useState(false)
  const currentYear = month.getFullYear()
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i)
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-sm font-medium text-foreground hover:text-primary transition-colors"
      >
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        {currentYear}
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 z-50 bg-white border rounded-lg shadow-lg py-1 max-h-48 overflow-y-auto w-20">
          {years.map((y) => (
            <button
              key={y}
              type="button"
              className={cn(
                "w-full text-left px-3 py-1.5 text-sm hover:bg-muted/50 transition-colors",
                y === currentYear && "bg-primary/10 text-primary font-medium"
              )}
              onClick={() => {
                const d = new Date(month)
                d.setFullYear(y)
                onChange(d)
                setOpen(false)
              }}
            >
              {y}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function CalendarGrid({
  month,
  range,
  hoverDate,
  onDateClick,
  onDateHover,
}: {
  month: Date
  range: DateRange
  hoverDate: Date | null
  onDateClick: (d: Date) => void
  onDateHover: (d: Date | null) => void
}) {
  const start = startOfMonth(month)
  const end = endOfMonth(month)
  const days = eachDayOfInterval({ start, end })
  const startDayOfWeek = getDay(start)
  const blanks = Array.from({ length: startDayOfWeek }, (_, i) => i)

  const isRangeStart = (d: Date) => range.from && isSameDay(d, range.from)
  const isRangeEnd = (d: Date) => range.to && isSameDay(d, range.to)

  const isInRange = (d: Date) => {
    if (range.from && range.to) {
      return isWithinInterval(d, { start: range.from, end: range.to })
    }
    if (range.from && !range.to && hoverDate) {
      const s = isBefore(hoverDate, range.from) ? hoverDate : range.from
      const e = isAfter(hoverDate, range.from) ? hoverDate : range.from
      return isWithinInterval(d, { start: s, end: e })
    }
    return false
  }

  const isInHoverRange = (d: Date) => {
    if (range.from && !range.to && hoverDate && !isSameDay(hoverDate, range.from)) {
      const s = isBefore(hoverDate, range.from) ? hoverDate : range.from
      const e = isAfter(hoverDate, range.from) ? hoverDate : range.from
      return isWithinInterval(d, { start: s, end: e }) && !isSameDay(d, range.from)
    }
    return false
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-7 mb-2">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="h-8 flex items-center justify-center text-xs font-medium text-muted-foreground">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {blanks.map((i) => (
          <div key={`blank-${i}`} className="h-9" />
        ))}
        {days.map((day) => {
          const isStart = isRangeStart(day)
          const isEnd = isRangeEnd(day)
          const inRange = isInRange(day)
          const inHover = isInHoverRange(day)

          return (
            <div
              key={day.toISOString()}
              className={cn(
                "relative h-9 flex items-center justify-center",
                (inRange || inHover) && !isStart && !isEnd && "bg-primary/10",
                isStart && "bg-gradient-to-r from-transparent to-primary/10 rounded-l-none",
                isEnd && "bg-gradient-to-l from-transparent to-primary/10 rounded-r-none",
                isStart && isEnd && "bg-transparent",
              )}
            >
              <button
                type="button"
                onClick={() => onDateClick(day)}
                onMouseEnter={() => onDateHover(day)}
                className={cn(
                  "relative z-10 h-8 w-8 rounded-md text-sm font-medium transition-all",
                  "hover:bg-primary/20 hover:text-primary",
                  !isStart && !isEnd && !inRange && !inHover && "text-foreground",
                  (inRange || inHover) && !isStart && !isEnd && "text-primary/80",
                  (isStart || isEnd) && "bg-primary text-white hover:bg-primary/90 hover:text-white shadow-sm",
                )}
              >
                {day.getDate()}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = "Select date range",
  className,
  disabled,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [leftMonth, setLeftMonth] = React.useState(() =>
    value?.from ? startOfMonth(value.from) : startOfMonth(new Date())
  )
  const [rightMonth, setRightMonth] = React.useState(() =>
    value?.to ? startOfMonth(value.to) : addMonths(startOfMonth(new Date()), 1)
  )
  const [internalRange, setInternalRange] = React.useState<DateRange>(value || { from: undefined, to: undefined })
  const [hoverDate, setHoverDate] = React.useState<Date | null>(null)
  const [selectingEnd, setSelectingEnd] = React.useState(false)

  React.useEffect(() => {
    if (value) setInternalRange(value)
  }, [value])

  React.useEffect(() => {
    if (isSameMonth(leftMonth, rightMonth) || isAfter(leftMonth, rightMonth)) {
      setRightMonth(addMonths(leftMonth, 1))
    }
  }, [leftMonth])

  React.useEffect(() => {
    if (isSameMonth(leftMonth, rightMonth) || isBefore(rightMonth, leftMonth)) {
      setLeftMonth(subMonths(rightMonth, 1))
    }
  }, [rightMonth])

  function handleDateClick(d: Date) {
    if (!selectingEnd || !internalRange.from) {
      setInternalRange({ from: d, to: undefined })
      setSelectingEnd(true)
    } else {
      const from = internalRange.from
      if (isBefore(d, from)) {
        setInternalRange({ from: d, to: from })
      } else {
        setInternalRange({ from, to: d })
      }
      setSelectingEnd(false)
    }
  }

  function handleApply() {
    if (internalRange.from && internalRange.to) {
      onChange?.(internalRange)
      setOpen(false)
    }
  }

  function handleClear() {
    setInternalRange({ from: undefined, to: undefined })
    setSelectingEnd(false)
    onChange?.({ from: undefined, to: undefined })
  }

  function handleCancel() {
    setInternalRange(value || { from: undefined, to: undefined })
    setSelectingEnd(false)
    setOpen(false)
  }

  const displayText = value?.from && value?.to
    ? `${format(value.from, "d MMMM yyyy")}  ~  ${format(value.to, "d MMMM yyyy")}`
    : placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "inline-flex items-center gap-2 h-10 px-4 rounded-lg border bg-background text-sm font-medium",
            "hover:bg-muted/50 transition-colors",
            !value?.from && "text-muted-foreground",
            disabled && "opacity-50 cursor-not-allowed",
            className,
          )}
        >
          <span className="truncate">{displayText}</span>
          {value?.from && (
            <X
              className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground shrink-0"
              onClick={(e) => {
                e.stopPropagation()
                handleClear()
              }}
            />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" sideOffset={8}>
        <div className="bg-white rounded-xl shadow-xl border p-5 min-w-[580px]">
          {/* Display bar */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2 bg-muted/30 rounded-lg px-4 py-2 text-sm font-medium min-w-[280px]">
              <span className={cn(!internalRange.from && "text-muted-foreground")}>
                {internalRange.from ? format(internalRange.from, "d MMMM yyyy") : "Start date"}
              </span>
              <span className="text-muted-foreground mx-1">~</span>
              <span className={cn(!internalRange.to && "text-muted-foreground")}>
                {internalRange.to ? format(internalRange.to, "d MMMM yyyy") : "End date"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-primary hover:text-primary/80 font-medium px-2 py-1"
              >
                Clear filters
              </button>
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleApply}
                disabled={!internalRange.from || !internalRange.to}
              >
                Apply
              </Button>
            </div>
          </div>

          {/* Labels */}
          <div className="grid grid-cols-2 gap-8 mb-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">From</p>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">To</p>
          </div>

          {/* Two calendars */}
          <div className="grid grid-cols-2 gap-8">
            <div>
              <div className="flex items-center justify-between mb-3">
                <MonthDropdown month={leftMonth} onChange={setLeftMonth} />
                <YearDropdown month={leftMonth} onChange={setLeftMonth} />
              </div>
              <CalendarGrid
                month={leftMonth}
                range={internalRange}
                hoverDate={hoverDate}
                onDateClick={handleDateClick}
                onDateHover={setHoverDate}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <MonthDropdown month={rightMonth} onChange={setRightMonth} />
                <YearDropdown month={rightMonth} onChange={setRightMonth} />
              </div>
              <CalendarGrid
                month={rightMonth}
                range={internalRange}
                hoverDate={hoverDate}
                onDateClick={handleDateClick}
                onDateHover={setHoverDate}
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

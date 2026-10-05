"use client";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { PageSection, SectionType } from "./section-types";
import { SectionRenderer } from "./section-renderer";
import { GripVertical, Trash2, ChevronUp, ChevronDown, Copy, Plus } from "lucide-react";

interface CanvasProps {
  sections: PageSection[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReorder: (sections: PageSection[]) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onAddAfter: (id: string) => void;
  onAddChild: (id: string, type: SectionType) => void;
}

export function SectionCanvas({
  sections,
  selectedId,
  onSelect,
  onReorder,
  onDelete,
  onDuplicate,
  onAddAfter,
  onAddChild,
}: CanvasProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = sections.findIndex((s) => s.id === active.id);
    const newIdx = sections.findIndex((s) => s.id === over.id);
    onReorder(arrayMove(sections, oldIdx, newIdx));
  }

  if (sections.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-center p-12">
        <div>
          <div className="w-16 h-16 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-4">
            <Plus className="w-7 h-7 text-zinc-400" />
          </div>
          <p className="text-sm font-semibold text-zinc-600">Canvas is empty</p>
          <p className="text-xs text-zinc-400 mt-1">Add sections from the left panel to get started</p>
        </div>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 overflow-y-auto bg-zinc-50 p-6">
          <div className="max-w-4xl mx-auto space-y-3">
            {sections.map((section) => (
              <SortableSection
                key={section.id}
                section={section}
                isSelected={selectedId === section.id}
                onSelect={onSelect}
                onDelete={onDelete}
                onDuplicate={onDuplicate}
                onAddAfter={onAddAfter}
                onAddChild={onAddChild}
              />
            ))}
          </div>
        </div>
      </SortableContext>
    </DndContext>
  );
}

// ─── Sortable Section Wrapper ─────────────────────────────────────────────────

function SortableSection({
  section,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
  onAddAfter,
  onAddChild,
}: {
  section: PageSection;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onAddAfter: (id: string) => void;
  onAddChild: (id: string, type: SectionType) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: section.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : "auto",
  };

  return (
    <div ref={setNodeRef} style={style as React.CSSProperties} className="group relative">
      {/* Selection ring */}
      <div
        onClick={() => onSelect(section.id)}
        className={`relative rounded-xl overflow-hidden border-2 cursor-pointer transition-all duration-150 ${
          isSelected
            ? "border-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.15)]"
            : "border-transparent hover:border-zinc-300"
        }`}
      >
        {/* Section label bar */}
        <div
          className={`flex items-center justify-between px-3 py-1.5 ${
            isSelected ? "bg-blue-50" : "bg-zinc-100"
          } border-b border-zinc-150`}
        >
          <div className="flex items-center gap-2">
            {/* Drag handle */}
            <button
              {...attributes}
              {...listeners}
              className="touch-none cursor-grab active:cursor-grabbing text-zinc-400 hover:text-zinc-600"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 select-none">
              {section.type}
            </span>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {(section.type === "grid" || section.type === "columns") && (
              <ToolBtn title="Add section inside" onClick={() => onAddChild(section.id, "text")}>
                <Plus className="w-3 h-3" />
              </ToolBtn>
            )}
            <ToolBtn title="Duplicate" onClick={() => onDuplicate(section.id)}>
              <Copy className="w-3 h-3" />
            </ToolBtn>
            <ToolBtn title="Add section below" onClick={() => onAddAfter(section.id)}>
              <Plus className="w-3 h-3" />
            </ToolBtn>
            <ToolBtn title="Delete" onClick={() => onDelete(section.id)} destructive>
              <Trash2 className="w-3 h-3" />
            </ToolBtn>
          </div>
        </div>

        {/* Live preview */}
        <div className="bg-white pointer-events-none select-none overflow-hidden rounded-b-xl border-t border-zinc-100">
          <SectionRenderer section={section} />
        </div>

        {/* Children Management UI for Layouts */}
        {(section.type === "grid" || section.type === "columns") && (
          <div className="bg-zinc-50 border-t border-zinc-200 p-3 flex flex-col gap-2 rounded-b-xl">
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1">Nested Sections</div>
            {section.children?.map((child) => (
              <div 
                key={child.id}
                onClick={(e) => { e.stopPropagation(); onSelect(child.id); }}
                className={`flex items-center justify-between p-2 rounded border bg-white cursor-pointer transition-colors ${
                  isSelected ? "border-blue-300" : "border-zinc-200 hover:border-zinc-300"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-zinc-700">{child.type}</span>
                </div>
                <div className="flex gap-1">
                  <ToolBtn title="Delete" onClick={() => onDelete(child.id)} destructive>
                    <Trash2 className="w-3 h-3" />
                  </ToolBtn>
                </div>
              </div>
            ))}
            <button 
              onClick={(e) => { e.stopPropagation(); onAddChild(section.id, "text"); }}
              className="flex items-center justify-center gap-1.5 p-2 rounded border border-dashed border-zinc-300 text-xs text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 transition-colors mt-1"
            >
              <Plus className="w-3 h-3" />
              Add Child Section
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ToolBtn({
  children,
  title,
  onClick,
  destructive,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`p-1.5 rounded-md transition-colors ${
        destructive
          ? "hover:bg-red-50 hover:text-red-600 text-zinc-400"
          : "hover:bg-zinc-200 text-zinc-500 hover:text-zinc-800"
      }`}
    >
      {children}
    </button>
  );
}

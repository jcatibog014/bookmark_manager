import { Check, FolderPlus, X } from 'lucide-react';
import { useState } from 'react';
import { useLibrary } from '../context/library';
import { useUI } from '../context/ui';
import { createCollection, RepoError } from '../db/repo';

interface CollectionSelectProps {
  value: number | null;
  onChange: (collectionId: number | null) => void;
  id?: string;
}

/** Collection picker with inline "new collection" creation. */
export default function CollectionSelect({ value, onChange, id }: CollectionSelectProps) {
  const { library } = useLibrary();
  const { toast } = useUI();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');

  const create = async () => {
    try {
      const newId = await createCollection(name);
      onChange(newId);
      setCreating(false);
      setName('');
    } catch (err) {
      toast(err instanceof RepoError ? err.message : 'Could not create the collection.', { tone: 'error' });
    }
  };

  if (creating) {
    return (
      <div className="flex gap-2">
        <input
          className="input"
          autoFocus
          value={name}
          placeholder="Collection name"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              void create();
            }
            if (e.key === 'Escape') {
              e.stopPropagation();
              setCreating(false);
            }
          }}
        />
        <button type="button" className="icon-btn shrink-0" onClick={() => void create()} aria-label="Create collection">
          <Check className="size-4" />
        </button>
        <button type="button" className="icon-btn shrink-0" onClick={() => setCreating(false)} aria-label="Cancel">
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <select
        id={id}
        className="input appearance-none bg-[length:16px] bg-[right_0.75rem_center] bg-no-repeat pr-9"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2371717a' stroke-width='2'%3e%3cpath d='m6 9 6 6 6-6'/%3e%3c/svg%3e\")",
        }}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      >
        <option value="">Unsorted</option>
        {library.collections.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <button type="button" className="btn-secondary shrink-0" onClick={() => setCreating(true)}>
        <FolderPlus className="size-4" />
        <span className="hidden sm:inline">New</span>
      </button>
    </div>
  );
}

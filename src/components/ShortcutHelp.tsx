import { useUI } from '../context/ui';
import Modal from './Modal';
import { MOD_KEY } from './TopBar';

const GROUPS: { title: string; items: [string[], string][] }[] = [
  {
    title: 'Anywhere',
    items: [
      [[MOD_KEY, 'K'], 'Quick search & commands'],
      [['N'], 'Add a bookmark'],
      [['/'], 'Focus the search box'],
      [['?'], 'Show this help'],
      [['Esc'], 'Close dialog / clear selection'],
    ],
  },
  {
    title: 'On a focused bookmark (Tab to move)',
    items: [
      [['Enter'], 'Open link in a new tab'],
      [['F'], 'Toggle favorite'],
      [['E'], 'Edit'],
      [['C'], 'Copy link'],
      [['I'], 'Show details'],
      [['Space'], 'Select'],
      [['Del'], 'Delete (with undo)'],
    ],
  },
  {
    title: 'Selecting',
    items: [[['Shift', 'Click'], 'Select a range of bookmarks']],
  },
];

export default function ShortcutHelp() {
  const { setHelpOpen } = useUI();
  return (
    <Modal title="Keyboard shortcuts" onClose={() => setHelpOpen(false)}>
      <div className="flex flex-col gap-5 px-5 pt-4 pb-5">
        {GROUPS.map((group) => (
          <section key={group.title}>
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-zinc-500 uppercase">{group.title}</h3>
            <dl className="flex flex-col gap-1.5">
              {group.items.map(([keys, label]) => (
                <div key={label} className="flex items-center justify-between gap-4 text-sm">
                  <dt className="text-zinc-700 dark:text-zinc-300">{label}</dt>
                  <dd className="flex shrink-0 items-center gap-1">
                    {keys.map((key) => (
                      <kbd key={key} className="kbd">
                        {key}
                      </kbd>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Modal>
  );
}

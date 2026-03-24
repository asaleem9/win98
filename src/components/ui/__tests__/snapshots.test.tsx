import { render, cleanup } from '@testing-library/react';
import { Button98 } from '../Button98';
import { Input98 } from '../Input98';
import { Select98 } from '../Select98';
import { Checkbox98 } from '../Checkbox98';
import { Radio98 } from '../Radio98';
import { ProgressBar98 } from '../ProgressBar98';
import { TabControl98 } from '../TabControl98';
import { TreeView98, TreeNode } from '../TreeView98';
import { ListView98, ListItem } from '../ListView98';
import { Toolbar98 } from '../Toolbar98';
import { StatusBar98 } from '../StatusBar98';
import { ScrollBar98 } from '../ScrollBar98';
import { GroupBox98 } from '../GroupBox98';
import { Tooltip98 } from '../Tooltip98';
import { Dialog98 } from '../Dialog98';

afterEach(cleanup);

describe('Button98 snapshots', () => {
  it('default variant', () => {
    const { container } = render(<Button98>OK</Button98>);
    expect(container).toMatchSnapshot();
  });

  it('flat variant', () => {
    const { container } = render(<Button98 variant="flat">Edit</Button98>);
    expect(container).toMatchSnapshot();
  });

  it('start variant', () => {
    const { container } = render(<Button98 variant="start">Start</Button98>);
    expect(container).toMatchSnapshot();
  });

  it('active state', () => {
    const { container } = render(<Button98 active>Active</Button98>);
    expect(container).toMatchSnapshot();
  });

  it('disabled state', () => {
    const { container } = render(<Button98 disabled>Disabled</Button98>);
    expect(container).toMatchSnapshot();
  });
});

describe('Input98 snapshots', () => {
  it('default variant', () => {
    const { container } = render(<Input98 placeholder="Type here" />);
    expect(container).toMatchSnapshot();
  });

  it('flat variant', () => {
    const { container } = render(<Input98 variant="flat" placeholder="Flat" />);
    expect(container).toMatchSnapshot();
  });

  it('disabled state', () => {
    const { container } = render(<Input98 disabled value="Disabled" />);
    expect(container).toMatchSnapshot();
  });
});

describe('Select98 snapshots', () => {
  it('with options', () => {
    const { container } = render(
      <Select98>
        <option value="a">Option A</option>
        <option value="b">Option B</option>
      </Select98>
    );
    expect(container).toMatchSnapshot();
  });

  it('disabled state', () => {
    const { container } = render(
      <Select98 disabled>
        <option value="a">Option A</option>
      </Select98>
    );
    expect(container).toMatchSnapshot();
  });
});

describe('Checkbox98 snapshots', () => {
  it('unchecked', () => {
    const { container } = render(<Checkbox98 label="Enable sounds" />);
    expect(container).toMatchSnapshot();
  });

  it('checked', () => {
    const { container } = render(<Checkbox98 label="Enable sounds" defaultChecked />);
    expect(container).toMatchSnapshot();
  });

  it('disabled', () => {
    const { container } = render(<Checkbox98 label="Unavailable" disabled />);
    expect(container).toMatchSnapshot();
  });
});

describe('Radio98 snapshots', () => {
  it('unselected', () => {
    const { container } = render(<Radio98 label="Option 1" name="group" />);
    expect(container).toMatchSnapshot();
  });

  it('selected', () => {
    const { container } = render(<Radio98 label="Option 1" name="group" defaultChecked />);
    expect(container).toMatchSnapshot();
  });

  it('disabled', () => {
    const { container } = render(<Radio98 label="Option 1" name="group" disabled />);
    expect(container).toMatchSnapshot();
  });
});

describe('ProgressBar98 snapshots', () => {
  it('0% progress', () => {
    const { container } = render(<ProgressBar98 value={0} />);
    expect(container).toMatchSnapshot();
  });

  it('50% progress', () => {
    const { container } = render(<ProgressBar98 value={50} />);
    expect(container).toMatchSnapshot();
  });

  it('100% progress', () => {
    const { container } = render(<ProgressBar98 value={100} />);
    expect(container).toMatchSnapshot();
  });

  it('non-segmented', () => {
    const { container } = render(<ProgressBar98 value={50} segmented={false} />);
    expect(container).toMatchSnapshot();
  });
});

describe('TabControl98 snapshots', () => {
  const tabs = [
    { id: 'general', label: 'General', content: <div>General settings</div> },
    { id: 'advanced', label: 'Advanced', content: <div>Advanced settings</div> },
  ];

  it('first tab active', () => {
    const { container } = render(<TabControl98 tabs={tabs} defaultTab="general" />);
    expect(container).toMatchSnapshot();
  });

  it('second tab active', () => {
    const { container } = render(<TabControl98 tabs={tabs} defaultTab="advanced" />);
    expect(container).toMatchSnapshot();
  });
});

describe('TreeView98 snapshots', () => {
  const nodes: TreeNode[] = [
    {
      id: 'root',
      label: 'My Computer',
      children: [
        { id: 'c', label: 'C:\\' },
        { id: 'd', label: 'D:\\' },
      ],
    },
  ];

  it('expanded (default for root)', () => {
    const { container } = render(<TreeView98 nodes={nodes} />);
    expect(container).toMatchSnapshot();
  });

  it('with selected node', () => {
    const { container } = render(<TreeView98 nodes={nodes} selectedId="c" />);
    expect(container).toMatchSnapshot();
  });
});

describe('ListView98 snapshots', () => {
  const items: ListItem[] = [
    { id: '1', name: 'Document.txt', icon: '/icons/notepad-32.svg', icon16: '/icons/notepad-16.svg', type: 'Text Document', size: '4 KB' },
    { id: '2', name: 'Picture.bmp', icon: '/icons/paint-32.svg', icon16: '/icons/paint-16.svg', type: 'Bitmap Image', size: '256 KB' },
  ];

  it('large-icon mode', () => {
    const { container } = render(<ListView98 items={items} mode="large-icons" />);
    expect(container).toMatchSnapshot();
  });

  it('details mode', () => {
    const columns = [
      { key: 'name', label: 'Name', width: 180 },
      { key: 'type', label: 'Type', width: 120 },
      { key: 'size', label: 'Size', width: 80 },
    ];
    const { container } = render(<ListView98 items={items} mode="details" columns={columns} />);
    expect(container).toMatchSnapshot();
  });
});

describe('Toolbar98 snapshots', () => {
  it('with items and separator', () => {
    const items = [
      { id: 'new', label: 'New', icon: <span>📄</span> },
      { id: 'sep', separator: true },
      { id: 'save', label: 'Save', icon: <span>💾</span>, disabled: true },
    ];
    const { container } = render(<Toolbar98 items={items} />);
    expect(container).toMatchSnapshot();
  });
});

describe('StatusBar98 snapshots', () => {
  it('with multiple panels', () => {
    const panels = [
      { content: 'Ready' },
      { content: 'Ln 1, Col 1', width: 100 },
      { content: 'INS', width: 40, align: 'center' as const },
    ];
    const { container } = render(<StatusBar98 panels={panels} />);
    expect(container).toMatchSnapshot();
  });
});

describe('ScrollBar98 snapshots', () => {
  const noop = () => {};

  it('vertical', () => {
    const { container } = render(
      <ScrollBar98 orientation="vertical" value={0} max={100} viewportSize={50} onChange={noop} />
    );
    expect(container).toMatchSnapshot();
  });

  it('horizontal', () => {
    const { container } = render(
      <ScrollBar98 orientation="horizontal" value={30} max={100} viewportSize={50} onChange={noop} />
    );
    expect(container).toMatchSnapshot();
  });
});

describe('GroupBox98 snapshots', () => {
  it('with label', () => {
    const { container } = render(
      <GroupBox98 label="Display Settings">
        <span>Content here</span>
      </GroupBox98>
    );
    expect(container).toMatchSnapshot();
  });

  it('without label', () => {
    const { container } = render(
      <GroupBox98>
        <span>Content here</span>
      </GroupBox98>
    );
    expect(container).toMatchSnapshot();
  });
});

describe('Tooltip98 snapshots', () => {
  it('rendered (hidden by default)', () => {
    const { container } = render(
      <Tooltip98 text="This is a tooltip">
        <button>Hover me</button>
      </Tooltip98>
    );
    expect(container).toMatchSnapshot();
  });
});

describe('Dialog98 snapshots', () => {
  const noop = () => {};

  it('error icon', () => {
    const { container } = render(
      <Dialog98
        title="Error"
        icon="error"
        message="An error has occurred."
        buttons={[{ label: 'OK', onClick: noop, default: true }]}
      />
    );
    expect(container).toMatchSnapshot();
  });

  it('warning icon', () => {
    const { container } = render(
      <Dialog98
        title="Warning"
        icon="warning"
        message="Are you sure you want to continue?"
        buttons={[
          { label: 'Yes', onClick: noop, default: true },
          { label: 'No', onClick: noop },
        ]}
      />
    );
    expect(container).toMatchSnapshot();
  });
});

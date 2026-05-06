import type { ComponentPropsWithoutRef, ElementType } from "react";

type Props<T extends ElementType> = ComponentPropsWithoutRef<T> & {
  node?: unknown;
};

function H1({ node: _, ...props }: Props<"h1">) {
  return (
    <h1
      className="mt-3 mb-1.5 text-[13px] font-bold leading-tight first:mt-0"
      {...props}
    />
  );
}

function H2({ node: _, ...props }: Props<"h2">) {
  return (
    <h2
      className="mt-2.5 mb-1 text-[13px] font-semibold leading-tight first:mt-0"
      {...props}
    />
  );
}

function H3({ node: _, ...props }: Props<"h3">) {
  return (
    <h3
      className="mt-2 mb-1 text-[12.5px] font-semibold leading-tight first:mt-0"
      {...props}
    />
  );
}

function H4({ node: _, ...props }: Props<"h4">) {
  return (
    <h4
      className="mt-2 mb-0.5 text-[12px] font-semibold leading-tight first:mt-0"
      {...props}
    />
  );
}

function H5({ node: _, ...props }: Props<"h5">) {
  return (
    <h5
      className="mt-1.5 mb-0.5 text-[12px] font-medium leading-tight first:mt-0"
      {...props}
    />
  );
}

function H6({ node: _, ...props }: Props<"h6">) {
  return (
    <h6
      className="mt-1.5 mb-0.5 text-[11.5px] font-medium leading-tight text-muted-foreground first:mt-0"
      {...props}
    />
  );
}

function P({ node: _, ...props }: Props<"p">) {
  return (
    <p
      className="my-1 text-[13px] leading-snug last:mb-0 first:mt-0"
      {...props}
    />
  );
}

function Ul({ node: _, ...props }: Props<"ul">) {
  return (
    <ul
      className="my-1 ml-3.5 list-disc text-[13px] leading-snug [&_ul]:my-0.5 [&_ul]:ml-3"
      {...props}
    />
  );
}

function Ol({ node: _, ...props }: Props<"ol">) {
  return (
    <ol
      className="my-1 ml-3.5 list-decimal text-[13px] leading-snug [&_ol]:my-0.5 [&_ol]:ml-3"
      {...props}
    />
  );
}

function Li({ node: _, ...props }: Props<"li">) {
  return <li className="my-0.5 pl-0.5 text-[13px] leading-snug" {...props} />;
}

function Blockquote({ node: _, ...props }: Props<"blockquote">) {
  return (
    <blockquote
      className="my-1.5 border-l-2 border-muted-foreground/30 pl-2.5 text-[12.5px] leading-snug text-muted-foreground italic"
      {...props}
    />
  );
}

function Hr({ node: _, ...props }: Props<"hr">) {
  return <hr className="my-2 border-border/50" {...props} />;
}

function A({ node: _, ...props }: Props<"a">) {
  return (
    <a
      className="text-[13px] text-primary underline underline-offset-2 decoration-primary/40 hover:decoration-primary"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  );
}

function InlineCode({ node: _, ...props }: Props<"code">) {
  return (
    <code
      className="rounded-sm bg-muted px-1 py-0.5 font-mono text-[11.5px] leading-none"
      {...props}
    />
  );
}

function Pre({ node: _, ...props }: Props<"pre">) {
  return (
    <pre
      className="my-1.5 overflow-x-auto rounded-md border bg-muted/50 p-2 font-mono text-[11.5px] leading-snug"
      {...props}
    />
  );
}

function Table({ node: _, ...props }: Props<"table">) {
  return (
    <div className="my-1.5 overflow-x-auto">
      <table className="w-full text-[12px] leading-snug" {...props} />
    </div>
  );
}

function Th({ node: _, ...props }: Props<"th">) {
  return (
    <th
      className="border-b border-border/50 px-2 py-1 text-left text-[12px] font-semibold"
      {...props}
    />
  );
}

function Td({ node: _, ...props }: Props<"td">) {
  return (
    <td
      className="border-b border-border/30 px-2 py-0.5 text-[12px]"
      {...props}
    />
  );
}

function Strong({ node: _, ...props }: Props<"strong">) {
  return <strong className="font-semibold" {...props} />;
}

function Em({ node: _, ...props }: Props<"em">) {
  return <em className="italic" {...props} />;
}

export const chatStreamdownComponents = {
  h1: H1,
  h2: H2,
  h3: H3,
  h4: H4,
  h5: H5,
  h6: H6,
  p: P,
  ul: Ul,
  ol: Ol,
  li: Li,
  blockquote: Blockquote,
  hr: Hr,
  a: A,
  inlineCode: InlineCode,
  pre: Pre,
  table: Table,
  th: Th,
  td: Td,
  strong: Strong,
  em: Em,
};

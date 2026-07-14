import { formatPostDate } from "@lib/utils/dates";
import { toRoman } from "@lib/utils/roman";
import {
  WIDTH,
  HEIGHT,
  INK,
  INK_DIM,
  BRASS,
  CELEST,
  HAIR,
  div,
  compose,
  type Node,
} from "./base";
import { standardChart, siteChart, lostChart } from "./charts";

// ---- plate furniture shared by every variant ----

const frame = (children: Node[]): Node =>
  div(
    {
      width: WIDTH,
      height: HEIGHT,
      display: "flex",
      flexDirection: "column",
      padding: 80,
      position: "relative",
      overflow: "hidden",
    },
    children,
  );

const eyebrow = (text: string, color: string = CELEST): Node =>
  div(
    {
      fontFamily: "Spline Sans Mono",
      fontWeight: 300,
      fontSize: 22,
      letterSpacing: 7,
      textTransform: "uppercase",
      color,
    },
    text,
  );

const title = (
  text: string,
  overrides: Record<string, string | number> = {},
): Node =>
  div(
    {
      // satori only applies lineClamp to block-display text elements
      display: "block",
      fontFamily: "Marcellus",
      fontWeight: 400,
      fontSize: 64,
      lineHeight: 1.22,
      letterSpacing: 2,
      color: INK,
      marginTop: 40,
      maxWidth: 900,
      lineClamp: 3,
      ...overrides,
    },
    text,
  );

const motto = (text: string): Node =>
  div(
    {
      fontFamily: "Cormorant",
      fontStyle: "italic",
      fontWeight: 500,
      fontSize: 34,
      letterSpacing: 1,
      color: BRASS,
      marginTop: 26,
    },
    text,
  );

const spacer = (): Node => div({ flexGrow: 1 });

const rule = (): Node =>
  div({
    height: 1,
    width: "100%",
    backgroundColor: HAIR,
    marginBottom: 30,
  });

// Bottom meta row: mono details on the left, the Z·M·C monogram on the right.
const metaRow = (left: Node[]): Node =>
  div(
    {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      width: "100%",
    },
    [
      div(
        {
          display: "flex",
          alignItems: "baseline",
          fontFamily: "Spline Sans Mono",
          fontWeight: 300,
          fontSize: 20,
          letterSpacing: 3,
          textTransform: "uppercase",
        },
        left,
      ),
      div(
        {
          fontFamily: "Marcellus",
          fontSize: 24,
          letterSpacing: 8,
          color: BRASS,
        },
        "Z·M·C",
      ),
    ],
  );

// ---- post plate: the original transmission card ----

export interface RenderPostImageInput {
  title: string;
  date: string;
  tags: string[];
}

export const renderPostImage = ({
  title: postTitle,
  date,
  tags,
}: RenderPostImageInput): Promise<Buffer> =>
  compose(
    standardChart(),
    frame([
      // The eyebrow stays pinned as a masthead while the title floats centered
      // in the field beneath it, so short titles sit level with the compass
      // rather than stranding the whole card's slack below them.
      eyebrow("TRANSMISSION · ZMC.DEV"),
      spacer(),
      title(postTitle, { marginTop: 0 }),
      spacer(),
      rule(),
      metaRow([
        div({ color: INK_DIM }, formatPostDate(date)),
        div({ color: BRASS, marginLeft: 36 }, tags.join(" · ")),
      ]),
    ]),
  );

// ---- site plate: the identity card, the full orrery seated at right ----

export const renderSiteImage = (): Promise<Buffer> => {
  const epoch = toRoman(new Date().getFullYear());
  return compose(
    siteChart(),
    frame([
      spacer(),
      eyebrow(`ZMC.DEV · EPOCH ${epoch} · ARKANSAS`),
      title("ZACH CALLAHAN", {
        fontSize: 76,
        lineHeight: 1.12,
        letterSpacing: 4,
        maxWidth: 560,
        lineClamp: 2,
      }),
      motto("Feet on the ground. Head in the cloud."),
      spacer(),
      rule(),
      metaRow([
        div({ color: INK_DIM }, "FULL-STACK · KUBERNETES · OPEN SOURCE"),
      ]),
    ]),
  );
};

// ---- index plate: the catalogue card for listings ----

export interface RenderIndexImageInput {
  eyebrow: string;
  title: string;
  note: string;
  count: number;
}

export const renderIndexImage = ({
  eyebrow: eyebrowText,
  title: indexTitle,
  note,
  count,
}: RenderIndexImageInput): Promise<Buffer> => {
  const entries = `${toRoman(count)} ${count === 1 ? "ENTRY" : "ENTRIES"}`;
  return compose(
    standardChart(),
    frame([
      eyebrow(eyebrowText),
      title(indexTitle, { textTransform: "uppercase", letterSpacing: 4 }),
      // ledger rules: the catalogue's remaining entries, trailing off
      div({ height: 1, width: "62%", backgroundColor: HAIR, marginTop: 46 }),
      div({ height: 1, width: "44%", backgroundColor: HAIR, marginTop: 26 }),
      div({ height: 1, width: "26%", backgroundColor: HAIR, marginTop: 26 }),
      spacer(),
      rule(),
      metaRow([
        div({ color: INK_DIM }, note),
        div({ color: BRASS, marginLeft: 36 }, entries),
      ]),
    ]),
  );
};

// ---- resume plate: the personnel dossier card ----

export interface RenderResumeImageInput {
  name: string;
  designation: string;
  location: string;
  site: string;
}

export const renderResumeImage = ({
  name,
  designation,
  location,
  site,
}: RenderResumeImageInput): Promise<Buffer> => {
  const epoch = toRoman(new Date().getFullYear());
  return compose(
    standardChart(),
    frame([
      eyebrow(`PERSONNEL DOSSIER · ${epoch}`),
      title(name.toUpperCase(), { letterSpacing: 4, lineClamp: 2 }),
      motto(designation),
      spacer(),
      rule(),
      metaRow([
        div({ color: INK_DIM }, location),
        div({ color: BRASS, marginLeft: 36 }, site),
      ]),
    ]),
  );
};

// ---- lost plate: the 404 card, sun off its orbit ----

export const renderNotFoundImage = (): Promise<Buffer> =>
  compose(
    lostChart(),
    frame([
      eyebrow("SIGNAL LOST · COORDINATES UNKNOWN", BRASS),
      title("404", {
        fontSize: 150,
        lineHeight: 1.1,
        letterSpacing: 30,
        marginTop: 36,
      }),
      div(
        {
          fontFamily: "Marcellus",
          fontSize: 32,
          letterSpacing: 4,
          color: BRASS,
          marginTop: 18,
        },
        "This transmission does not exist.",
      ),
      spacer(),
      rule(),
      metaRow([div({ color: INK_DIM }, "NO KNOWN ORBIT")]),
    ]),
  );

// ---- talk plate: the symposium card ----

export interface RenderTalkImageInput {
  title: string;
  date: string;
  event: string;
}

export const renderTalkImage = ({
  title: talkTitle,
  date,
  event,
}: RenderTalkImageInput): Promise<Buffer> =>
  compose(
    standardChart(),
    frame([
      // Same masthead-and-floating-title balance as the post plate.
      eyebrow("SYMPOSIUM · ZMC.DEV"),
      spacer(),
      title(talkTitle, { marginTop: 0 }),
      spacer(),
      rule(),
      metaRow([
        div({ color: INK_DIM }, formatPostDate(date)),
        div({ color: BRASS, marginLeft: 36 }, event),
      ]),
    ]),
  );

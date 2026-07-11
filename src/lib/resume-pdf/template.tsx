import {
  Document,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { monthKey, shortDate, type Month } from "../utils/tenure";

/**
 * Plain-data shapes for the PDF, structurally satisfied by the site's
 * `resume` and `jobs` collections. Kept astro-free so the module renders
 * in the browser (lazy-loaded) and under vitest alike.
 */
export interface ResumePdfJob {
  company: string;
  title: string;
  tenure: { start: Month; end?: Month };
  isTech: boolean;
  highlights?: string[];
}

export interface ResumePdfData {
  name: string;
  location: string;
  email: string;
  phone: { display: string; tel: string };
  site: string;
  github: string;
  linkedin: string;
  summary: string;
  skills: { name: string; level: string; category: string }[];
  certifications: { name: string; short: string; issuer: string; year?: number }[];
  jobs: ResumePdfJob[];
}

export const resumePdfFilename = (name: string) => `${name} - Resume.pdf`;

const styles = StyleSheet.create({
  page: {
    fontFamily: "Times-Roman",
    fontSize: 10,
    lineHeight: 1.35,
    color: "#000",
    paddingVertical: 44,
    paddingHorizontal: 54,
  },
  name: {
    fontFamily: "Times-Bold",
    fontSize: 20,
    lineHeight: 1,
    letterSpacing: 2,
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: 6,
  },
  contactLine: {
    fontSize: 9,
    textAlign: "center",
    marginTop: 3,
  },
  link: {
    color: "#000",
    textDecoration: "none",
  },
  sectionHeader: {
    fontFamily: "Times-Bold",
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    borderBottomWidth: 0.75,
    borderBottomColor: "#000",
    paddingBottom: 2,
    marginTop: 14,
    marginBottom: 6,
  },
  entryHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  company: {
    fontFamily: "Times-Bold",
    fontSize: 10.5,
  },
  title: {
    fontFamily: "Times-Italic",
  },
  dates: {
    fontSize: 9.5,
  },
  entry: {
    marginBottom: 7,
  },
  bulletRow: {
    flexDirection: "row",
    marginTop: 1,
  },
  bulletGlyph: {
    width: 12,
    paddingLeft: 2,
  },
  bulletText: {
    flex: 1,
  },
  lineItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 2,
  },
  skillRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  skillCategory: {
    fontFamily: "Times-Bold",
    width: 150,
  },
  skillList: {
    flex: 1,
  },
});

const span = (tenure: ResumePdfJob["tenure"]) =>
  `${shortDate(tenure.start)} – ${tenure.end ? shortDate(tenure.end) : "Present"}`;

const byTenureDesc = (a: ResumePdfJob, b: ResumePdfJob) =>
  monthKey(b.tenure.end) - monthKey(a.tenure.end) ||
  monthKey(b.tenure.start) - monthKey(a.tenure.start);

function SectionHeader({ children }: { children: string }) {
  return <Text style={styles.sectionHeader}>{children}</Text>;
}

export function HarvardResume({ data }: { data: ResumePdfData }) {
  const techJobs = data.jobs.filter((j) => j.isTech).sort(byTenureDesc);
  const otherJobs = data.jobs.filter((j) => !j.isTech).sort(byTenureDesc);

  const categories = [...new Set(data.skills.map((s) => s.category))];

  return (
    <Document
      title={`${data.name} — Resume`}
      author={data.name}
      producer="zmc.dev"
      creator="zmc.dev"
    >
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.name}>{data.name}</Text>
        <Text style={styles.contactLine}>
          {data.location} ·{" "}
          <Link style={styles.link} src={`mailto:${data.email}`}>
            {data.email}
          </Link>{" "}
          ·{" "}
          <Link style={styles.link} src={`tel:${data.phone.tel}`}>
            {data.phone.display}
          </Link>
        </Text>
        <Text style={styles.contactLine}>
          <Link style={styles.link} src={`https://${data.site}`}>
            {data.site}
          </Link>{" "}
          ·{" "}
          <Link style={styles.link} src={data.github}>
            {data.github.replace(/^https:\/\/(www\.)?/, "")}
          </Link>{" "}
          ·{" "}
          <Link style={styles.link} src={data.linkedin}>
            {data.linkedin.replace(/^https:\/\/(www\.)?/, "").replace(/\/$/, "")}
          </Link>
        </Text>

        <SectionHeader>Summary</SectionHeader>
        <Text>{data.summary}</Text>

        <SectionHeader>Experience</SectionHeader>
        {techJobs.map((job) => (
          <View key={job.company} style={styles.entry}>
            <View style={styles.entryHead}>
              <Text style={styles.company}>{job.company}</Text>
              <Text style={styles.dates}>{span(job.tenure)}</Text>
            </View>
            <Text style={styles.title}>{job.title}</Text>
            {(job.highlights ?? []).map((highlight) => (
              <View key={highlight} style={styles.bulletRow}>
                <Text style={styles.bulletGlyph}>•</Text>
                <Text style={styles.bulletText}>{highlight}</Text>
              </View>
            ))}
          </View>
        ))}

        <SectionHeader>Additional Experience</SectionHeader>
        {otherJobs.map((job) => (
          <View key={job.company} style={styles.lineItem}>
            <Text>
              <Text style={{ fontFamily: "Times-Bold" }}>{job.title}</Text>
              {", "}
              {job.company}
            </Text>
            <Text style={styles.dates}>{span(job.tenure)}</Text>
          </View>
        ))}

        <SectionHeader>Skills</SectionHeader>
        {categories.map((category) => (
          <View key={category} style={styles.skillRow}>
            <Text style={styles.skillCategory}>{category}</Text>
            <Text style={styles.skillList}>
              {data.skills
                .filter((s) => s.category === category)
                .map((s) => s.name)
                .join(", ")}
            </Text>
          </View>
        ))}

        <SectionHeader>Certifications</SectionHeader>
        {data.certifications.map((cert) => (
          <View key={cert.short} style={styles.lineItem}>
            <Text>
              {cert.name} ({cert.short}), {cert.issuer}
            </Text>
            {cert.year ? <Text style={styles.dates}>{cert.year}</Text> : null}
          </View>
        ))}
      </Page>
    </Document>
  );
}

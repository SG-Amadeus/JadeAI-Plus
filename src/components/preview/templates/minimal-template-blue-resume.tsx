
import type { ReactNode } from 'react';
import type {
  Resume,
  PersonalInfoContent,
  SummaryContent,
  ProjectsContent,
  CertificationsContent,
  LanguagesContent,
  CustomContent,
  GitHubContent,
  WorkProject,
} from '@/types/resume';
import { isSectionEmpty, md } from '../utils';
import { AvatarImage } from '../avatar-image';
import { QrCodesPreview } from '../qr-codes-preview';

const BLUE = '#1F4E79';
const SEP = 'mx-2 h-px min-w-4 flex-1 bg-[#1F4E79]';

export function MinimalBlueTemplate({ resume }: { resume: Resume }) {
  const personalInfo = resume.sections.find((section) => section.type === 'personal_info');
  const pi = (personalInfo?.content || {}) as PersonalInfoContent;
  const zh = resume.language === 'zh';

  const personalItems = [
    { label: zh ? '电话' : 'Phone', value: pi.phone },
    { label: zh ? '邮箱' : 'Email', value: pi.email },
    { label: zh ? '性别' : 'Gender', value: pi.gender },
    { label: zh ? '年龄' : 'Age', value: pi.age },
    { label: zh ? '民族' : 'Ethnicity', value: pi.ethnicity },
    { label: zh ? '政治面貌' : 'Political status', value: pi.politicalStatus },
    { label: zh ? '微信' : 'WeChat', value: pi.wechat },
    { label: zh ? '籍贯' : 'Hometown', value: pi.hometown },
    { label: zh ? '婚姻状况' : 'Marital status', value: pi.maritalStatus },
    { label: zh ? '工作年限' : 'Experience', value: pi.yearsOfExperience },
    { label: zh ? '学历' : 'Education', value: pi.educationLevel },
    { label: zh ? '所在地' : 'Location', value: pi.location },
    { label: 'LinkedIn', value: pi.linkedin },
    { label: 'GitHub', value: pi.github },
  ].filter((item) => item.value);

  return (
    <div
      className="mx-auto w-full max-w-[210mm] bg-white px-[15mm] py-[10mm] text-[10pt] leading-[1.45] text-[#111827] shadow-lg print:shadow-none"
      style={{ fontFamily: "'Microsoft YaHei', 'Noto Sans SC', 'Arial', sans-serif" }}
    >
      <header className="relative">
        <div className="min-h-[20px] pr-[84px] text-center">
          <h1 className="text-[22pt] font-bold leading-none tracking-[0.08em]" style={{ color: BLUE }}>
            {pi.fullName || (zh ? '姓名' : 'Your Name')}
          </h1>
          {pi.jobTitle && (
            <p className="mt-0.5 text-[11pt] font-medium" style={{ color: BLUE }}>
              {pi.jobTitle}
            </p>
          )}
        </div>

        <div className="mt-1.5 grid grid-cols-[minmax(0,1fr)_68px] gap-x-5">
          <div className="grid grid-cols-2 gap-x-8 gap-y-0.5 text-[11pt]">
            {personalItems.map((item) => (
              <div key={`${item.label}-${String(item.value)}`} className="flex min-w-0 items-baseline">
                <span className="mr-1 shrink-0 font-bold" style={{ color: BLUE }}>
                  ▸
                </span>
                <span className="mr-1 shrink-0 font-medium text-[#111827]">{item.label}:</span>
                <span className="min-w-0 break-all text-[#111827]">{String(item.value)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-0 right-0 top-0 flex items-stretch justify-end">
          {pi.avatar ? (
            <AvatarImage
              src={pi.avatar}
              avatarStyle={resume.themeConfig?.avatarStyle}
              size={80}
              style={{
                height: '100%',
                width: 'auto',
                aspectRatio: (resume.themeConfig?.avatarStyle ?? 'oneInch') === 'circle' ? '1 / 1' : '5 / 7',
              }}
            />
          ) : (
            <span className="flex items-center text-[16pt] font-bold" style={{ color: BLUE }}>
              {zh ? '照片' : 'Photo'}
            </span>
          )}
        </div>
      </header>

      <main>
        {resume.sections
          .filter((section) => section.visible && section.type !== 'personal_info' && !isSectionEmpty(section))
          .map((section) => (
            <section key={section.id} className="mb-3" data-section>
              <SectionTitle title={section.title} />
              <MinimalSectionContent section={section} lang={resume.language} />
            </section>
          ))}
      </main>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <div className="mb-1.5 mt-2">
      <h2 className="text-[14pt] font-bold" style={{ color: BLUE }}>
        {title}
      </h2>
      <div className="mt-0.5 h-[2px] w-full" style={{ backgroundColor: BLUE }} />
    </div>
  );
}

function EntryHeader({
  left,
  middle,
  right,
}: {
  left?: ReactNode;
  middle?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center text-[12pt] font-bold leading-5" style={{ color: BLUE }}>
      {left && <span className="max-w-[42%] shrink-0 truncate">{left}</span>}
      {left && middle && <span className={SEP} />}
      {middle && <span className="max-w-[36%] shrink-0 truncate">{middle}</span>}
      {(left || middle) && right && <span className={SEP} />}
      {right && <span className="shrink-0 whitespace-nowrap text-[11pt]">{right}</span>}
    </div>
  );
}

function DateRange({ item, lang }: { item: any; lang?: string }) {
  if (!item.startDate && !item.endDate && !item.current) return null;

  const end = item.endDate || (item.current ? (lang === 'zh' ? '至今' : 'Present') : '');
  return (
    <>
      {item.startDate}
      {item.startDate && end ? ' ~ ' : ''}
      {end}
    </>
  );
}

function RichText({ html, className = '' }: { html?: string; className?: string }) {
  if (!html) return null;
  return (
    <div
      className={`[&_p]:my-0 [&_ul]:my-0 [&_ol]:my-0 [&_li]:my-0 ${className}`}
      dangerouslySetInnerHTML={{ __html: md(html) }}
    />
  );
}

function HighlightList({ items }: { items?: string[] }) {
  if (!items?.length) return null;

  return (
    <ul className="mt-0.5 space-y-0">
      {items.map((highlight, index) => (
        <li key={index} className="grid grid-cols-[9px_1fr] text-[11pt] leading-[1.45] text-[#20242c]">
          <span className="font-bold" style={{ color: BLUE }}>
            •
          </span>
          <RichText html={highlight} className="min-w-0" />
        </li>
      ))}
    </ul>
  );
}

function MinimalSectionContent({ section, lang }: { section: any; lang?: string }) {
  const content = section.content;
  if (!content) return null;

  if (section.type === 'summary') {
    return (
      <RichText
        html={(content as SummaryContent).text}
        className="text-[11pt] leading-[1.45] text-[#20242c]"
      />
    );
  }

  if (section.type === 'work_experience') {
    return (
      <div className="space-y-2.5">
        {(content.items || []).map((item: any) => (
          <article key={item.id} className="break-inside-avoid">
            <div className="flex min-w-0 items-center text-[12pt] font-bold leading-5" style={{ color: BLUE }}>
              <span className="max-w-[42%] shrink-0 truncate">{item.company || item.position}</span>
              {item.company && item.department && (
                <>
                  <span className={SEP} />
                  <span className="max-w-[36%] shrink-0 truncate">{item.department}</span>
                </>
              )}
              {item.company && item.position && (
                <>
                  <span className={SEP} />
                  <span className="max-w-[36%] shrink-0 truncate">{item.position}</span>
                </>
              )}
              <span className={SEP} />
              <span className="shrink-0 whitespace-nowrap text-[11pt]">
                <DateRange item={item} lang={lang} />
              </span>
            </div>
            <RichText html={item.description} className="mt-0.5 text-[11pt] leading-[1.45] text-[#20242c]" />
            {item.technologies?.length > 0 && (
              <p className="mt-0.5 text-[10pt] text-[#374151]">
                <span className="font-semibold" style={{ color: BLUE }}>
                  {lang === 'zh' ? '技术栈：' : 'Tech: '}
                </span>
                {item.technologies.join(' / ')}
              </p>
            )}
            <HighlightList items={item.highlights} />
            {item.projects?.length > 0 && (
              <div className="mt-1.5 space-y-1.5">
                {item.projects.map((proj: WorkProject) => (
                  <div key={proj.id} className="break-inside-avoid">
                    <p className="text-[11pt] font-semibold" style={{ color: BLUE }}>
                      {proj.name}
                    </p>
                    <HighlightList items={proj.highlights} />
                  </div>
                ))}
              </div>
            )}
          </article>
        ))}
      </div>
    );
  }

  if (section.type === 'education') {
    return (
      <div className="space-y-2.5">
        {(content.items || []).map((item: any) => (
          <article key={item.id} className="break-inside-avoid">
            <EntryHeader
              left={item.institution}
              middle={item.degree && item.field ? `${item.degree} - ${item.field}` : (item.degree || item.field || '')}
              right={<DateRange item={item} lang={lang} />}
            />
            {(item.gpa || item.description) && (
              <p className="mt-0.5 text-[10pt] leading-[1.45] text-[#20242c]">
                {item.gpa && (
                  <>
                    <span className="font-semibold" style={{ color: BLUE }}>
                      GPA：
                    </span>
                    {item.gpa}
                  </>
                )}
                {item.gpa && item.description && <span className="mx-2 text-[#9ca3af]">|</span>}
                {item.description && <span>{item.description}</span>}
              </p>
            )}
            <HighlightList items={item.highlights} />
          </article>
        ))}
      </div>
    );
  }

  if (section.type === 'skills') {
    return (
      <div className="space-y-1">
        {(content.categories || []).map((category: any) => (
          <p key={category.id} className="text-[11pt] leading-[1.45] text-[#20242c]">
            {category.name && (
              <span className="font-semibold" style={{ color: BLUE }}>
                {category.name}：
              </span>
            )}
            {category.skills?.join(' / ')}
          </p>
        ))}
      </div>
    );
  }

  if (section.type === 'projects') {
    const items = (content as ProjectsContent).items || [];
    return (
      <div className="space-y-2.5">
        {items.map((item: any) => (
            <article key={item.id} className="break-inside-avoid">
              <div className="flex min-w-0 items-center text-[12pt] font-bold leading-5" style={{ color: BLUE }}>
                <span className="max-w-[35%] shrink-0 truncate">{item.name}</span>
                {item.url && (
                  <>
                    <span className="mx-1.5 h-px w-3 shrink-0 bg-[#1F4E79]" />
                    <span className="max-w-[45%] shrink-0 truncate text-[10pt] font-normal">{item.url}</span>
                  </>
                )}
                <span className={SEP} />
                <span className="shrink-0 whitespace-nowrap text-[11pt]">
                  <DateRange item={item} lang={lang} />
                </span>
              </div>
              <RichText html={item.description} className="mt-0.5 text-[11pt] leading-[1.45] text-[#20242c]" />
              {item.technologies?.length > 0 && (
                <p className="mt-0.5 text-[10pt] text-[#374151]">
                  <span className="font-semibold" style={{ color: BLUE }}>
                    {lang === 'zh' ? '技术栈：' : 'Tech: '}
                  </span>
                  {item.technologies.join(' / ')}
                </p>
              )}
              <HighlightList items={item.highlights} />
            </article>
          ))}
      </div>
    );
  }

  if (section.type === 'github') {
    const items = (content as GitHubContent).items || [];
    return (
      <div className="space-y-2.5">
        {items.map((item: any) => (
          <article key={item.id} className="break-inside-avoid">
            <EntryHeader
              left={item.name}
              middle={item.language}
              right={item.stars != null ? `★ ${item.stars.toLocaleString()}` : undefined}
            />
            <RichText html={item.description} className="mt-0.5 text-[11pt] leading-[1.45] text-[#20242c]" />
          </article>
        ))}
      </div>
    );
  }

  if (section.type === 'certifications') {
    const items = (content as CertificationsContent).items || [];
    return (
      <div className="space-y-2">
        {items.map((item: any) => (
          <article key={item.id} className="break-inside-avoid">
            <EntryHeader left={item.name} middle={item.issuer} right={item.date} />
          </article>
        ))}
      </div>
    );
  }

  if (section.type === 'languages') {
    const items = (content as LanguagesContent).items || [];
    return (
      <div className="flex flex-wrap gap-x-8 gap-y-1 text-[11pt]">
        {items.map((item: any) => (
          <span key={item.id}>
            <span className="font-semibold" style={{ color: BLUE }}>
              {item.language}：
            </span>
            <span className="text-[#20242c]">{item.proficiency}</span>
          </span>
        ))}
      </div>
    );
  }

  if (section.type === 'custom') {
    const items = (content as CustomContent).items || [];
    return (
      <div className="space-y-2.5">
        {items.map((item: any) => (
          <article key={item.id} className="break-inside-avoid">
            <EntryHeader left={item.title} middle={item.subtitle} right={item.date} />
            <RichText html={item.description} className="mt-0.5 text-[11pt] leading-[1.45] text-[#20242c]" />
          </article>
        ))}
      </div>
    );
  }

  if (section.type === 'qr_codes') {
    return <QrCodesPreview items={(content as any).items || []} />;
  }

  if (content?.items) {
    return (
      <div className="space-y-2.5">
        {content.items.map((item: any) => (
          <article key={item.id} className="break-inside-avoid">
            <EntryHeader left={item.name || item.title || item.language} right={item.date} />
            <RichText html={item.description} className="mt-0.5 text-[11pt] leading-[1.45] text-[#20242c]" />
          </article>
        ))}
      </div>
    );
  }

  return null;
}

import type {
  SummaryContent,
  WorkExperienceContent,
  EducationContent,
  SkillsContent,
  ProjectsContent,
  CertificationsContent,
  LanguagesContent,
  CustomContent,
  GitHubContent,
} from '@/types/resume';
import { esc, md, degreeField, getPersonalInfo, visibleSections, buildHighlights, buildQrCodesHtml, type ResumeWithSections, type Section } from '../utils';

const BLUE = '#073b82';

function buildEntryHeader(left?: string, middle?: string, right?: string): string {
  const parts: string[] = [];
  if (left) parts.push(`<span class="max-w-[38%] shrink-0 truncate">${esc(left)}</span>`);
  if ((left || middle) && middle) parts.push(`<span class="mx-2 h-px min-w-5 flex-1 bg-[#073b82]"></span>`);
  if (middle) parts.push(`<span class="max-w-[34%] shrink-0 truncate">${esc(middle)}</span>`);
  if (middle && right) parts.push(`<span class="mx-2 h-px min-w-5 flex-1 bg-[#073b82]"></span>`);
  if (right) parts.push(`<span class="shrink-0 whitespace-nowrap text-[10px] tracking-wide">${esc(right)}</span>`);
  return `<div class="flex min-w-0 items-center text-[10.5px] font-semibold leading-5" style="color:#073b82">${parts.join('')}</div>`;
}

function buildDateRange(item: any, lang: string): string {
  if (!item.startDate && !item.endDate && !item.current) return '';
  const end = item.endDate || (item.current ? (lang === 'zh' ? '至今' : 'Present') : '');
  let result = esc(item.startDate || '');
  if (item.startDate && end) result += ' ~ ';
  result += esc(end);
  return result;
}

function buildHL(items?: string[], className = 'text-[10.5px] leading-[1.55] text-[#20242c]'): string {
  if (!items?.length) return '';
  return `<ul class="mt-1 space-y-0.5">${items.map((h) =>
    `<li class="grid grid-cols-[9px_1fr] ${className}"><span class="font-bold" style="color:#073b82">•</span><div class="min-w-0 [&_p]:my-0 [&_ul]:my-0 [&_ol]:my-0 [&_li]:my-0">${md(h)}</div></li>`
  ).join('')}</ul>`;
}

function buildMinimalBlueSectionContent(section: Section, lang: string = 'en'): string {
  const c = section.content as any;

  if (section.type === 'summary') {
    return `<div class="text-[10.5px] leading-[1.65] text-[#20242c] [&_p]:my-0 [&_ul]:my-0 [&_ol]:my-0 [&_li]:my-0">${md((c as SummaryContent).text)}</div>`;
  }

  if (section.type === 'work_experience') {
    return `<div class="space-y-3">${((c as WorkExperienceContent).items || []).map((it: any) => `<article class="break-inside-avoid">
      ${buildEntryHeader(it.company || it.position, it.company ? it.position : undefined, buildDateRange(it, lang))}
      ${it.description ? `<div class="mt-1 text-[10.5px] leading-[1.6] text-[#20242c] [&_p]:my-0 [&_ul]:my-0 [&_ol]:my-0 [&_li]:my-0">${md(it.description)}</div>` : ''}
      ${it.technologies?.length ? `<p class="mt-1 text-[10px] text-[#374151]"><span class="font-semibold" style="color:#073b82">${lang === 'zh' ? '技术栈：' : 'Tech: '}</span>${esc(it.technologies.join(' / '))}</p>` : ''}
      ${buildHL(it.highlights)}
    </article>`).join('')}</div>`;
  }

  if (section.type === 'education') {
    return `<div class="space-y-3">${((c as EducationContent).items || []).map((it: any) => `<article class="break-inside-avoid">
      ${buildEntryHeader(it.institution, degreeField(it.degree, it.field), buildDateRange(it, lang))}
      ${it.gpa ? `<p class="mt-1 text-[10px] text-[#20242c]"><span class="font-semibold" style="color:#073b82">GPA：</span>${esc(it.gpa)}</p>` : ''}
      ${buildHL(it.highlights)}
    </article>`).join('')}</div>`;
  }

  if (section.type === 'skills') {
    return `<div class="space-y-1">${((c as SkillsContent).categories || []).map((cat: any) =>
      `<p class="text-[10.5px] leading-[1.55] text-[#20242c]">${cat.name ? `<span class="font-semibold" style="color:#073b82">${esc(cat.name)}：</span>` : ''}${esc((cat.skills || []).join(' / '))}</p>`
    ).join('')}</div>`;
  }

  if (section.type === 'projects') {
    return `<div class="space-y-3">${((c as ProjectsContent).items || []).map((it: any) => `<article class="break-inside-avoid">
      ${buildEntryHeader(it.name, it.role || it.position, buildDateRange(it, lang))}
      ${it.description ? `<div class="mt-1 text-[10.5px] leading-[1.6] text-[#20242c] [&_p]:my-0 [&_ul]:my-0 [&_ol]:my-0 [&_li]:my-0">${md(it.description)}</div>` : ''}
      ${it.technologies?.length ? `<p class="mt-1 text-[10px] text-[#374151]"><span class="font-semibold" style="color:#073b82">${lang === 'zh' ? '技术栈：' : 'Tech: '}</span>${esc(it.technologies.join(' / '))}</p>` : ''}
      ${buildHL(it.highlights)}
    </article>`).join('')}</div>`;
  }

  if (section.type === 'github') {
    return `<div class="space-y-3">${((c as GitHubContent).items || []).map((it: any) => `<article class="break-inside-avoid">
      ${buildEntryHeader(it.name, it.language, it.stars != null ? `★ ${it.stars.toLocaleString()}` : undefined)}
      ${it.description ? `<div class="mt-1 text-[10.5px] leading-[1.6] text-[#20242c] [&_p]:my-0 [&_ul]:my-0 [&_ol]:my-0 [&_li]:my-0">${md(it.description)}</div>` : ''}
    </article>`).join('')}</div>`;
  }

  if (section.type === 'certifications') {
    return `<div class="space-y-2">${((c as CertificationsContent).items || []).map((it: any) =>
      `<article class="break-inside-avoid">${buildEntryHeader(it.name, it.issuer, it.date)}</article>`
    ).join('')}</div>`;
  }

  if (section.type === 'languages') {
    return `<div class="flex flex-wrap gap-x-8 gap-y-1 text-[10.5px]">${((c as LanguagesContent).items || []).map((it: any) =>
      `<span><span class="font-semibold" style="color:#073b82">${esc(it.language)}：</span><span class="text-[#20242c]">${esc(it.proficiency)}</span></span>`
    ).join('')}</div>`;
  }

  if (section.type === 'custom') {
    return `<div class="space-y-3">${((c as CustomContent).items || []).map((it: any) => `<article class="break-inside-avoid">
      ${buildEntryHeader(it.title, it.subtitle, it.date)}
      ${it.description ? `<div class="mt-1 text-[10.5px] leading-[1.6] text-[#20242c] [&_p]:my-0 [&_ul]:my-0 [&_ol]:my-0 [&_li]:my-0">${md(it.description)}</div>` : ''}
    </article>`).join('')}</div>`;
  }

  if (section.type === 'qr_codes') return buildQrCodesHtml(section);

  if (c.items) {
    return `<div class="space-y-3">${c.items.map((it: any) => `<article class="break-inside-avoid">
      ${buildEntryHeader(it.name || it.title || it.language, undefined, it.date)}
      ${it.description ? `<div class="mt-1 text-[10.5px] leading-[1.6] text-[#20242c] [&_p]:my-0 [&_ul]:my-0 [&_ol]:my-0 [&_li]:my-0">${md(it.description)}</div>` : ''}
    </article>`).join('')}</div>`;
  }

  return '';
}

export function buildMinimalBlueHtml(resume: ResumeWithSections): string {
  const pi = getPersonalInfo(resume);
  const sections = visibleSections(resume);
  const zh = resume.language === 'zh';

  const personalItems = [
    { label: zh ? '性别' : 'Gender', value: pi.gender },
    { label: zh ? '电话' : 'Phone', value: pi.phone },
    { label: zh ? '年龄' : 'Age', value: pi.age },
    { label: zh ? '邮箱' : 'Email', value: pi.email },
    { label: zh ? '政治面貌' : 'Political status', value: pi.politicalStatus },
    { label: zh ? '微信' : 'WeChat', value: pi.wechat },
    { label: zh ? '民族' : 'Ethnicity', value: pi.ethnicity },
    { label: zh ? '籍贯' : 'Hometown', value: pi.hometown },
    { label: zh ? '婚姻状况' : 'Marital status', value: pi.maritalStatus },
    { label: zh ? '工作年限' : 'Experience', value: pi.yearsOfExperience },
    { label: zh ? '学历' : 'Education', value: pi.educationLevel },
    { label: zh ? '所在地' : 'Location', value: pi.location },
    { label: 'LinkedIn', value: pi.linkedin },
    { label: 'GitHub', value: pi.github },
  ].filter((item) => item.value);

  const personalItemsHtml = personalItems.map((item) =>
    `<div class="flex min-w-0 items-baseline"><span class="mr-1 shrink-0 font-bold" style="color:#073b82">▸</span><span class="mr-1 shrink-0 font-medium text-[#111827]">${esc(item.label)}:</span><span class="min-w-0 break-all text-[#111827]">${esc(String(item.value))}</span></div>`
  ).join('');

  const sectionTitleHtml = (title: string) =>
    `<div class="mb-2 mt-3 flex items-center gap-3"><div class="flex-1 border-t-2 border-dotted" style="border-color:#073b82"></div><h2 class="shrink-0 text-[12px] font-bold" style="color:#073b82">${esc(title)}</h2><div class="flex-1 border-t-2 border-dotted" style="border-color:#073b82"></div></div>`;

  const sectionsHtml = sections.map((s) =>
    `<section class="mb-4" data-section>${sectionTitleHtml(s.title)}${buildMinimalBlueSectionContent(s, resume.language || 'en')}</section>`
  ).join('');

  return `<div class="mx-auto min-h-[297mm] w-full max-w-[210mm] bg-white px-[8mm] pb-[8mm] pt-[4mm] text-[11px] leading-[1.45] text-[#111827] shadow-lg" style="font-family:'Microsoft YaHei','PingFang SC','SimSun',sans-serif">
    <header class="relative">
      <div class="min-h-[24px] pr-[78px] text-center">
        <h1 class="text-[20px] font-bold leading-none tracking-[0.08em]" style="color:#073b82">${esc(pi.fullName || (zh ? '姓名' : 'Your Name'))}</h1>
        ${pi.jobTitle ? `<p class="mt-1 text-[10px] font-medium" style="color:#073b82">${esc(pi.jobTitle)}</p>` : ''}
      </div>
      <div class="mt-2 grid grid-cols-[minmax(0,1fr)_68px] gap-x-5">
        <div class="grid grid-cols-2 gap-x-8 gap-y-1">${personalItemsHtml}</div>
        <div class="absolute right-0 top-0 flex h-[66px] w-[62px] items-center justify-center overflow-hidden">
          ${pi.avatar ? `<img src="${esc(pi.avatar)}" alt="" class="h-[66px] w-[62px] shrink-0 object-cover"/>` : `<span class="text-[17px] font-bold" style="color:#073b82">${zh ? '照片' : 'Photo'}</span>`}
        </div>
      </div>
    </header>
    <main>${sectionsHtml}</main>
  </div>`;
}

/**
 * Server-side renderer for preview components.
 *
 * Renders the SAME React component the user sees in the preview tab into an HTML
 * string for PDF/HTML export. This guarantees the exported output matches the
 * preview exactly — one code path, zero drift.
 *
 * Templates are pure functions (no hooks, no 'use client') and render safely
 * on both server and client. QR codes are handled separately by the export
 * pipeline via pre-generated SVGs (see builders.ts preGenerateQrSvgs).
 */
import type { Resume } from '@/types/resume';
import { ClassicTemplate } from '@/components/preview/templates/classic';
import { ModernTemplate } from '@/components/preview/templates/modern';
import { MinimalTemplate } from '@/components/preview/templates/minimal';
import { ProfessionalTemplate } from '@/components/preview/templates/professional';
import { TwoColumnTemplate } from '@/components/preview/templates/two-column';
import { CreativeTemplate } from '@/components/preview/templates/creative';
import { AtsTemplate } from '@/components/preview/templates/ats';
import { AcademicTemplate } from '@/components/preview/templates/academic';
import { ElegantTemplate } from '@/components/preview/templates/elegant';
import { ExecutiveTemplate } from '@/components/preview/templates/executive';
import { DeveloperTemplate } from '@/components/preview/templates/developer';
import { DesignerTemplate } from '@/components/preview/templates/designer';
import { StartupTemplate } from '@/components/preview/templates/startup';
import { FormalTemplate } from '@/components/preview/templates/formal';
import { InfographicTemplate } from '@/components/preview/templates/infographic';
import { CompactTemplate } from '@/components/preview/templates/compact';
import { EuroTemplate } from '@/components/preview/templates/euro';
import { CleanTemplate } from '@/components/preview/templates/clean';
import { BoldTemplate } from '@/components/preview/templates/bold';
import { TimelineTemplate } from '@/components/preview/templates/timeline';
import { NordicTemplate } from '@/components/preview/templates/nordic';
import { CorporateTemplate } from '@/components/preview/templates/corporate';
import { ConsultantTemplate } from '@/components/preview/templates/consultant';
import { FinanceTemplate } from '@/components/preview/templates/finance';
import { MedicalTemplate } from '@/components/preview/templates/medical';
import { GradientTemplate } from '@/components/preview/templates/gradient';
import { MetroTemplate } from '@/components/preview/templates/metro';
import { MaterialTemplate } from '@/components/preview/templates/material';
import { CoderTemplate } from '@/components/preview/templates/coder';
import { BlocksTemplate } from '@/components/preview/templates/blocks';
import { MagazineTemplate } from '@/components/preview/templates/magazine';
import { ArtisticTemplate } from '@/components/preview/templates/artistic';
import { RetroTemplate } from '@/components/preview/templates/retro';
import { NeonTemplate } from '@/components/preview/templates/neon';
import { WatercolorTemplate } from '@/components/preview/templates/watercolor';
import { SwissTemplate } from '@/components/preview/templates/swiss';
import { JapaneseTemplate } from '@/components/preview/templates/japanese';
import { BerlinTemplate } from '@/components/preview/templates/berlin';
import { LuxeTemplate } from '@/components/preview/templates/luxe';
import { RoseTemplate } from '@/components/preview/templates/rose';
import { ArchitectTemplate } from '@/components/preview/templates/architect';
import { LegalTemplate } from '@/components/preview/templates/legal';
import { TeacherTemplate } from '@/components/preview/templates/teacher';
import { ScientistTemplate } from '@/components/preview/templates/scientist';
import { EngineerTemplate } from '@/components/preview/templates/engineer';
import { SidebarTemplate } from '@/components/preview/templates/sidebar';
import { CardTemplate } from '@/components/preview/templates/card';
import { ZigzagTemplate } from '@/components/preview/templates/zigzag';
import { RibbonTemplate } from '@/components/preview/templates/ribbon';
import { MosaicTemplate } from '@/components/preview/templates/mosaic';
import { MinimalBlueTemplate } from '@/components/preview/templates/minimal-template-blue-resume';

const templateMap: Record<string, React.ComponentType<{ resume: Resume }>> = {
  classic: ClassicTemplate, modern: ModernTemplate, minimal: MinimalTemplate,
  professional: ProfessionalTemplate, 'two-column': TwoColumnTemplate,
  creative: CreativeTemplate, ats: AtsTemplate, academic: AcademicTemplate,
  elegant: ElegantTemplate, executive: ExecutiveTemplate, developer: DeveloperTemplate,
  designer: DesignerTemplate, startup: StartupTemplate, formal: FormalTemplate,
  infographic: InfographicTemplate, compact: CompactTemplate, euro: EuroTemplate,
  clean: CleanTemplate, bold: BoldTemplate, timeline: TimelineTemplate,
  nordic: NordicTemplate, corporate: CorporateTemplate, consultant: ConsultantTemplate,
  finance: FinanceTemplate, medical: MedicalTemplate, gradient: GradientTemplate,
  metro: MetroTemplate, material: MaterialTemplate, coder: CoderTemplate,
  blocks: BlocksTemplate, magazine: MagazineTemplate, artistic: ArtisticTemplate,
  retro: RetroTemplate, neon: NeonTemplate, watercolor: WatercolorTemplate,
  swiss: SwissTemplate, japanese: JapaneseTemplate, berlin: BerlinTemplate,
  luxe: LuxeTemplate, rose: RoseTemplate, architect: ArchitectTemplate,
  legal: LegalTemplate, teacher: TeacherTemplate, scientist: ScientistTemplate,
  engineer: EngineerTemplate, sidebar: SidebarTemplate, card: CardTemplate,
  zigzag: ZigzagTemplate, ribbon: RibbonTemplate, mosaic: MosaicTemplate,
  'minimal-blue': MinimalBlueTemplate,
};

export async function renderPreviewHtml(resume: Resume): Promise<string> {
  const { renderToStaticMarkup } = await import('react-dom/server');
  const Template = templateMap[resume.template] || ClassicTemplate;
  const safeResume = resume.sections ? resume : { ...resume, sections: [] };
  return renderToStaticMarkup(<Template resume={safeResume} />);
}

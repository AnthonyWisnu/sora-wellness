import type { SiteBlockContext } from './SiteBlocks'
import { SiteBlock } from './SiteBlocks'
import './SitePages.css'

export function SitePage({ ctx }: { ctx: SiteBlockContext }) {
  return (
    <main className={`site-page site-page-${ctx.page}`}>
      {ctx.site.pages[ctx.page].map((section) => (
        <SiteBlock section={section} ctx={ctx} key={section.type} />
      ))}
    </main>
  )
}

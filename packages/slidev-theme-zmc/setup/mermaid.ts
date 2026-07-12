import { defineMermaidSetup } from '@slidev/types'

// Mermaid can't follow the live theme toggle, so diagrams commit to the
// chart's dark glass; the low-alpha fills still read acceptably on parchment.
export default defineMermaidSetup(() => {
  return {
    theme: 'base',
    themeVariables: {
      fontFamily: '"Instrument Sans", sans-serif',
      primaryColor: 'rgba(15, 19, 29, 0.55)',
      primaryTextColor: '#e8e4d8',
      primaryBorderColor: 'rgba(200, 169, 106, 0.34)',
      lineColor: '#c8a96a',
      secondaryColor: 'rgba(122, 147, 184, 0.18)',
      secondaryTextColor: '#e8e4d8',
      secondaryBorderColor: 'rgba(122, 147, 184, 0.18)',
      tertiaryColor: 'rgba(15, 19, 29, 0.3)',
      tertiaryTextColor: '#9ba0a8',
      tertiaryBorderColor: 'rgba(232, 228, 216, 0.13)',
      noteBkgColor: 'rgba(15, 19, 29, 0.55)',
      noteTextColor: '#e8e4d8',
      noteBorderColor: 'rgba(200, 169, 106, 0.34)',
      textColor: '#9ba0a8',
      edgeLabelBackground: '#0b0e14',
      clusterBkg: 'rgba(15, 19, 29, 0.3)',
      clusterBorder: 'rgba(232, 228, 216, 0.13)',
      mainBkg: 'rgba(15, 19, 29, 0.55)',
      nodeBorder: 'rgba(200, 169, 106, 0.34)',
      nodeTextColor: '#e8e4d8',
      arrowheadColor: '#c8a96a',
    },
  }
})

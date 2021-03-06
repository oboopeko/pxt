/// <reference path="../localtypings/pxtblockly.d.ts" />
/// <reference path="../built/pxtlib.d.ts" />

namespace pxt.blocks {
    let workspace: Blockly.Workspace;
    let blocklyDiv: HTMLElement;

    export enum BlockLayout {
        Align = 1,
        // Shuffle deprecated
        Clean = 3,
        Flow = 4
    }

    export interface BlocksRenderOptions {
        emPixels?: number;
        layout?: BlockLayout;
        clean?: boolean;
        aspectRatio?: number;
        packageId?: string;
        package?: string;
        snippetMode?: boolean;
        useViewWidth?: boolean;
    }

    export function render(blocksXml: string, options: BlocksRenderOptions = { emPixels: 14, layout: BlockLayout.Flow }): SVGSVGElement {
        if (!workspace) {
            blocklyDiv = document.createElement("div");
            blocklyDiv.style.position = "absolute";
            blocklyDiv.style.top = "0";
            blocklyDiv.style.left = "0";
            blocklyDiv.style.width = "1px";
            blocklyDiv.style.height = "1px";
            document.body.appendChild(blocklyDiv);
            workspace = Blockly.inject(blocklyDiv, {
                scrollbars: false,
                readOnly: true,
                sound: false,
                media: pxt.webConfig.commitCdnUrl + "blockly/media/",
                rtl: Util.isUserLanguageRtl()
            });
        }

        workspace.clear();
        try {
            let text = blocksXml || `<xml xmlns="http://www.w3.org/1999/xhtml"></xml>`;
            let xml = Blockly.Xml.textToDom(text);
            Blockly.Xml.domToWorkspace(xml, workspace);

            switch (options.layout) {
                case BlockLayout.Align:
                    pxt.blocks.layout.verticalAlign(workspace, options.emPixels || 14); break;
                case BlockLayout.Flow:
                    pxt.blocks.layout.flow(workspace, { ratio: options.aspectRatio, useViewWidth: options.useViewWidth }); break;
                case BlockLayout.Clean:
                    if ((<any>workspace).cleanUp_)
                        (<any>workspace).cleanUp_();
                    break;
            }

            let metrics = workspace.getMetrics();

            let svg = blocklyDiv.querySelectorAll('svg')[0].cloneNode(true) as SVGSVGElement;
            Blockly.utils.removeClass(svg as Element, "blocklySvg");
            Blockly.utils.addClass(svg as Element, "blocklyPreview");

            pxt.U.toArray(svg.querySelectorAll('.blocklyBlockCanvas,.blocklyBubbleCanvas'))
                .forEach(el => el.setAttribute('transform', `translate(${-metrics.contentLeft}, ${-metrics.contentTop}) scale(1)`));
            const blocklyMainBackground = svg.querySelectorAll('.blocklyMainBackground')[0];
            blocklyMainBackground.parentElement.removeChild(blocklyMainBackground);
            svg.setAttribute('viewBox', `0 0 ${metrics.contentWidth} ${metrics.contentHeight}`)
            svg.removeAttribute('width');
            svg.removeAttribute('height');

            if (options.emPixels) {
                svg.style.width = (metrics.contentWidth / options.emPixels) + 'em';
                svg.style.height = (metrics.contentHeight / options.emPixels) + 'em';
            }

            return svg as any;
        } catch (e) {
            pxt.reportException(e);

            // We re-use the workspace across renders, catch any errors so we know to 
            // create a new workspace if there was an error
            if (workspace) workspace.dispose();
            workspace = undefined;
            return undefined;
        }
    }

    export function blocksMetrics(ws: Blockly.Workspace): { width: number; height: number; } {
        const blocks = ws.getTopBlocks(false);
        if (!blocks.length) return { width: 0, height: 0 };

        let m: { l: number, r: number, t: number, b: number } = undefined;
        blocks.forEach(b => {
            const r = b.getBoundingRectangle();
            if (!m) m = { l: r.topLeft.x, r: r.bottomRight.x, t: r.topLeft.y, b: r.bottomRight.y }
            else {
                m.l = Math.min(m.l, r.topLeft.x);
                m.r = Math.max(m.r, r.bottomRight.y);
                m.t = Math.min(m.t, r.topLeft.y);
                m.b = Math.min(m.b, r.bottomRight.y);
            }
        })

        return {
            width: m.r - m.l,
            height: m.b - m.t
        };
    }
}
"use strict";

import CabinetBase from "./base";

enum Events {
    error = "error",
    saveStatusChange = "saveStatusChange",
    broadcast = "broadcast",
    enter = "enter",
    leave = "leave",
}

enum Status {
    OFFLINE = "offline",
    OFFLINE_SAVING = "offlineSaving",
    OFFLINE_SAVED = "offlineSaved",
    OFFLINE_SAVE_FAILED = "offlineSaveFailed",
    ONLINE = "online",
    ONLINE_SAVING = "onlineSaving",
    ONLINE_SAVED = "onlineSaved",
    ONLINE_SAVE_FAILED = "onlineSaveFailed",
    SERVER_CHANGE_APPLIED = "serverChangeApplied",
}

export default class ShimoSheetCabinet extends CabinetBase {
    private sdkSheet: any;
    private sdkCommon: any;
    private user: ShimoSDK.User;
    private entrypoint: string;
    private token: string;
    private file: ShimoSDK.File;
    private editorOptions: ShimoSDK.Sheet.EditorOptions;
    private plugins: string[];

    constructor(options: {
        rootDom: HTMLElement;
        sdkSheet: any;
        sdkCommon: any;
        user: ShimoSDK.User;
        entrypoint: string;
        token: string;
        file: ShimoSDK.File;
        editorOptions: ShimoSDK.Sheet.EditorOptions;
        plugins: string[];
    }) {
        super(options.rootDom);
        this.sdkSheet = options.sdkSheet;
        this.sdkCommon = options.sdkCommon;
        this.user = options.user;
        this.entrypoint = options.entrypoint;
        this.token = options.token;
        this.file = options.file;
        this.editorOptions = options.editorOptions;
        this.plugins =  this.sortPlugins(options.plugins);
    }

    public render() {
        const editor = this.initEditor(this.editorOptions);
        editor.render({
            content: this.file.content,
            container: this.getDom("editor"),
        });
        for (const plugin of this.plugins) {
            this[`init${plugin}`](editor);
        }

        const referenceNode = document.getElementById("toolbar") && document.getElementById("contextmenu");
        if (referenceNode) {
            this.insertAfter(referenceNode, this.getDom("editor"));
        }

        return editor;
    }

    public initEditor(options: ShimoSDK.Sheet.EditorOptions): ShimoSDK.Sheet.Editor {
        return new this.sdkSheet.Editor(options);
    }

    public initToolbar(editor: ShimoSDK.Sheet.Editor): void {
        const options: ShimoSDK.Sheet.ToolbarOptions = { editor };
        const toolbar: ShimoSDK.Sheet.Toolbar = new this.sdkSheet.plugins.Toolbar(options);
        toolbar.render({
            container: this.getDom("toolbar"),
        });
    }

    public initContextMenu(editor: ShimoSDK.Sheet.Editor): void {
        const options: ShimoSDK.Sheet.SheetContextmenuOptions = { editor };
        const contextMenu: ShimoSDK.Sheet.SheetContextmenu = new this.sdkSheet.plugins.ContextMenu(options);
        contextMenu.render({
            container: this.getDom("contextmenu"),
        });
    }

    public initComment(editor: ShimoSDK.Sheet.Editor): void {
        const options: ShimoSDK.Sheet.CommentOptions = {
            editor,
            container: this.getDom("sm-comment"),
            currentUser: this.user,
            guid: this.file.guid,
            usePollingInsteadOfSocket: {
                interval: 1000,
            },
            queryCommentOptions: {
                url: `${this.entrypoint}/files/${this.file.guid}/comments?accessToken=${this.token}&_legacy=1`,
            },
            deleteCommentOptions: {
                url: `${this.entrypoint}/files/${this.file.guid}` +
                    `/comments/{comment-id}?accessToken=${this.token}&_legacy=1`,
            },
            closeCommentOptions: {
                url: `${this.entrypoint}/comments/closeComments?accessToken=${this.token}&_legacy=1`,
            },
            createCommentOptions: {
                url: `${this.entrypoint}/files/${this.file.guid}/comments?accessToken=${this.token}&_legacy=1`,
            },
            fetchLocaleSync: (locale) => {
                return this.sdkSheet.plugins.CommentLocaleResources[locale];
            },
        };
        const comment: ShimoSDK.Sheet.Comment = new this.sdkSheet.plugins.Comment(options);
        comment.init();
    }

    public initHistorySidebarSkeleton(editor: ShimoSDK.Sheet.Editor): void {
        const options: ShimoSDK.Sheet.HistorySidebarSkeletonOptions = {
            editor,
            container: this.getDom("sidebar"),
            guid: this.file.guid,
            currentUserId: `${this.user.id}`,
            history: {
                loadHistoryUrl: `${this.entrypoint}/files/${this.file.guid}/` +
                    `histories?accessToken=${this.token}&_legacy=1`,
                revertUrl: `${this.entrypoint}/files/${this.file.guid}/revert?accessToken=${this.token}&_legacy=1`,
                snapshotUrl: `${this.entrypoint}/files/${this.file.guid}/snapshot?accessToken=${this.token}&_legacy=1`,
                loadStepsUrl: `${this.entrypoint}/files/${this.file.guid}/` +
                    `changes?from={from}&to={to}&accessToken=${this.token}&_legacy=1`,
                contactUrl: `${this.entrypoint}/users?accessToken=${this.token}&_legacy=1`,
            },
        };
        const historySidebarSkeleton: ShimoSDK.Sheet.HistorySidebarSkeleton =
            new this.sdkSheet.plugins.HistorySidebarSkeleton(options);
        const clickDom = this.getDom("external-actions").appendChild(this.getDom("external-actions-history"));
        if (!this.getDom("external-actions-history").innerText) {
            this.getDom("external-actions-history").innerText = "历史";
        }
        clickDom.addEventListener("click", () => {
            historySidebarSkeleton.show();
        });
    }

    public initFormulaSidebar(editor: ShimoSDK.Sheet.Editor): void {
        const options: ShimoSDK.Sheet.FormulaSidebarOptions = {
            editor,
            container: this.getDom("formula-sidebar"),
        };
        const formulaSidebar: ShimoSDK.Sheet.FormulaSidebar =
            new this.sdkSheet.plugins.FormulaSidebar(options);
        const clickDom = this.getDom("sm-click-formula");
        clickDom.addEventListener("click", () => {
            formulaSidebar.show();
        });
    }

    public initShortcut(editor: ShimoSDK.Sheet.Editor): void {
        const options: ShimoSDK.Sheet.ShortcutOptions = { editor };
        new this.sdkSheet.plugins.Shortcut(options);
    }

    public initChart(editor: ShimoSDK.Sheet.Editor): void {
        const options: ShimoSDK.Sheet.ChartOptions = { editor };
        new this.sdkSheet.plugins.Chart(options);
    }

    public initFill(editor: ShimoSDK.Sheet.Editor): void {
        const options: ShimoSDK.Sheet.FillOptions = { editor };
        new this.sdkSheet.plugins.Fill(options);
    }

    public initFilterViewport(editor: ShimoSDK.Sheet.Editor): void {
        const options: ShimoSDK.Sheet.FilterViewportOptions = { editor };
        new this.sdkSheet.plugins.FilterViewport(options);
    }

    public initCollaboration(editor: ShimoSDK.Sheet.Editor): void {
        const collaboratorsOptions: ShimoSDK.Sheet.CollaboratorsOptions = { editor };
        const collaborators = new this.sdkSheet.plugins.Collaborators(collaboratorsOptions);

        const collaborationOptions: ShimoSDK.Common.CollaborationOptions = {
            editor,
            rev: this.file.head,
            guid: this.file.guid,
            pullUrl: `${this.entrypoint}/files/${this.file.guid}/pull?accessToken=${this.token}`,
            composeUrl: `${this.entrypoint}/files/${this.file.guid}/compose?accessToken=${this.token}`,
            selectUrl: `${this.entrypoint}/files/${this.file.guid}/select?accessToken=${this.token}`,
            collaborators,
            offlineEditable: false,
        };
        const collaboration: ShimoSDK.Common.Collaboration = new this.sdkCommon.Collaboration(collaborationOptions);
        collaboration.start();
        collaboration.on(Events.saveStatusChange, this.onSaveStatusChange);
    }

    public onSaveStatusChange(status: string) {
        switch (status) {
          case Status.ONLINE_SAVING:
            break;
          case Status.ONLINE_SAVED:
            break;
          case Status.OFFLINE:
            break;
          case Status.ONLINE:
            break;
          // 在线保存失败
          case Status.ONLINE_SAVE_FAILED:
            break;
          case Status.OFFLINE_SAVE_FAILED:
            break;
        }
    }

    private sortPlugins(plugins: string[]) {
        const sortedPlugins = ["Toolbar",
        "ContextMenu",
        "Shortcut",
        "Fill",
        "HistorySidebarSkeleton",
        "FormulaSidebar",
        "FilterViewport",
        "Chart",
        "Comment",
        "Collaboration"];
        const commingPlugins = new Set(plugins);
        const selectedPlugins: string[] = [];

        for (const sortedPlugin of sortedPlugins) {
            if (commingPlugins.has(sortedPlugin)) {
                selectedPlugins.push(sortedPlugin);
            }
        }

        return selectedPlugins;
    }
}

import get from 'lodash.get'
import assign from 'object-assign'

import CabinetBase from './base'
import './document.css'

const historyContainerTemplate = `
  <div class="sm-history-sidebar">
    <div class="sm-history-container">
      <div class="sm-history-head">
        <b>历史</b>
        <a style="float: right;" class="sm-history-close-btn" href="javascript:void(0);">关闭</a>
      </div>
      <div class="sm-history-content" id="sm-history-content"></div>
    </div>
  </div>
`

export default class ShimoDocumentCabinet extends CabinetBase {
  public editor: ShimoSDK.Document.Editor
  private sdkCommon: any
  private sdkDocument: any
  private user: ShimoSDK.User
  private editorOptions: ShimoSDK.Document.EditorOptions
  private file: ShimoSDK.File
  private entrypoint: string
  private token: string
  private collaboration: ShimoSDK.Common.Collaboration
  protected plugins: ShimoSDK.Document.Plugins

  constructor (options: {
    element: HTMLElement
    sdkDocument: any
    sdkCommon: any
    user: ShimoSDK.User
    entrypoint: string
    token: string
    file: ShimoSDK.File
    editorOptions: ShimoSDK.Document.EditorOptions
    availablePlugins: string[]
  }) {
    super(options.element)
    this.sdkCommon = options.sdkCommon
    this.sdkDocument = options.sdkDocument
    this.user = options.user
    this.editorOptions = Object.assign({}, options.editorOptions, {
      editable: options.file.permissions?.editable,
      readable: options.file.permissions?.readable,
      commentable: options.file.permissions?.commentable
    })
    this.file = options.file
    this.entrypoint = options.entrypoint
    this.token = options.token
    this.availablePlugins = options.availablePlugins
    this.plugins = this.preparePlugins(options.editorOptions.plugins)
  }

  public render () {
    const editor = this.initEditor()
    let localeConfig: {
      fetchLocaleSync?: string;
      locale?: string;
    } = {}
    if (this.editorOptions.localeConfig) {
      localeConfig = this.editorOptions.localeConfig
    }

    const editorScroller = this.getElement(undefined, 'div', { id: 'sm-editor-scroller' })
    this.element.appendChild(editorScroller)
    editorScroller.classList.add('sm-editor-scroller')

    const toolbarOptions = this.getToolbarOptions()

    if (typeof toolbarOptions === 'object') {
      editorScroller.addEventListener('scroll', () => {
        if (editorScroller.scrollTop === 0) {
          toolbarOptions.parent.classList.remove('active')
        } else {
          toolbarOptions.parent.classList.add('active')
        }
      })
    }

    const editorElm = this.getElement(undefined, 'div', { id: 'sm-editor' })
    editorElm.classList.add('sm-editor')

    editor.render(
      editorScroller.appendChild(editorElm),
      {
        readOnly: !this.editorOptions.editable,
        id: this.user.id,
        localeConfig,
        modules: {
          toolbar: toolbarOptions
        }
      }
    )
    editor.setContent(this.file.content)

    this.initPlugins(editor)

    this.editor = editor

    return editor
  }

  public destroy (): void {
    this.editor.destroy()
    this.collaboration.destroy()
  }

  public initEditor (): ShimoSDK.Document.Editor {
    const options: ShimoSDK.Document.EditorOptions = {
      id: this.user.id,
      readOnly: !this.editorOptions.editable,
      editable: this.editorOptions.editable,
      commentable: this.editorOptions.commentable
    }
    return new this.sdkDocument.Editor(options)
  }

  public initGallery (editor: ShimoSDK.Document.Editor): void {
    const options: ShimoSDK.Document.GalleryOptions = {
      editor
    }
    const gallery: ShimoSDK.Document.Gallery = new this.sdkDocument.plugins.Gallery(options)
    gallery.render()
  }

  public initHistory (editor: ShimoSDK.Document.Editor, height: string): void {
    const options: ShimoSDK.Document.HistoryOptions = {
      editor,
      guid: this.file.guid,
      height,
      service: {
        fetch: `${this.entrypoint}/files/${this.file.guid}/` +
                  `histories?accessToken=${this.token}`,
        revert: `${this.entrypoint}/files/${this.file.guid}/revert?accessToken=${this.token}`,
        user: `${this.entrypoint}/users?accessToken=${this.token}`
      }
    }

    let rootContainer = document.querySelector('.sm-history-sidebar') as HTMLElement
    if (!rootContainer) {
      this.element.insertAdjacentHTML('afterend', historyContainerTemplate)
      rootContainer = document.querySelector('.sm-history-sidebar') as HTMLElement
    }

    const history: ShimoSDK.Document.History = new this.sdkDocument.plugins.History(options)

    let historyContainer = this.getElement(get(this.plugins, 'History.container'))
    if (!historyContainer) {
      this.element.insertAdjacentHTML('afterend', historyContainerTemplate)
      historyContainer = document.querySelector('.sm-history-container') as HTMLElement
    }

    const historyElement = this.getElement(undefined, 'div', { id: 'sm-history' })
    historyContainer.appendChild(historyElement)
    history.render(historyElement)

    const historyButton = this.getElement('#ql-history', 'button', { id: 'ql-history', type: 'button' })
    historyButton.classList.add('ql-history')

    if (!historyButton.textContent) {
      historyButton.textContent = '历史'
    }

    const toolbarGroup = document.querySelector('.ql-toolbar-default')!.querySelectorAll('.ql-formats')
    const toolbarContainer = toolbarGroup[toolbarGroup.length - 1]
    if (toolbarContainer) {
      toolbarContainer.appendChild(historyButton)
    }

    historyButton.addEventListener('click', () => {
      historyContainer!.style.display = 'block'
      history.show()
      editor.comment.hide()
    })

    document.querySelector('.sm-history-close-btn')!.addEventListener('click', () => {
      historyContainer!.style.display = 'none'
      editor.comment.show()
    })
  }

  public initTableOfContent (editor: ShimoSDK.Document.Editor): void {
    const options: ShimoSDK.Document.TableOfContentOptions = assign({
      editor
    }, this.plugins.TableOfContent)

    const tableOfContent: ShimoSDK.Document.TableOfContent = new this.sdkDocument.plugins.TableOfContent(options)
    if (options.container instanceof HTMLElement) {
      options.container.classList.add('table-of-content')
    }
    tableOfContent.render(options.container)
  }

  public initCollaboration (editor: ShimoSDK.Document.Editor): void {
    const collaboratorOptions: ShimoSDK.Document.CollaboratorsOptions = {
      service: {
        user: `${this.entrypoint}/users?accessToken=${this.token}`
      },
      avatarTrack: true,
      cursorTrack: true,

      ...get(this.editorOptions, 'plugins.Collaborators', {}),

      editor,
      user: this.user
    }
    const collaborators: ShimoSDK.Document.Collaborator = new this.sdkDocument.plugins.Collaborator(collaboratorOptions)

    const collaborationOptions: ShimoSDK.Common.CollaborationOptions = assign(
      {
        pullUrl: `${this.entrypoint}/files/${this.file.guid}/pull?accessToken=${this.token}`,
        composeUrl: `${this.entrypoint}/files/${this.file.guid}/compose?accessToken=${this.token}`,
        selectUrl: `${this.entrypoint}/files/${this.file.guid}/select?accessToken=${this.token}`,
        offlineEditable: false
      },
      this.plugins.Collaboration,
      {
        editor,
        type: 'richdoc',
        rev: this.file.head,
        guid: this.file.guid,
        collaborators
      }
    )
    const collaboration: ShimoSDK.Common.Collaboration = new this.sdkCommon.Collaboration(collaborationOptions)
    if (typeof collaborationOptions.onSaveStatusChange === 'function') {
      collaboration.on('saveStatusChange' as ShimoSDK.Common.CollaborationEvents, collaborationOptions.onSaveStatusChange)
    }

    collaboration.start()
    collaborators.render(collaboration)

    this.collaboration = collaboration
  }

  public initComment (editor: ShimoSDK.Document.Editor): void {
    const options: ShimoSDK.Document.CommentOptions = {
      editor,
      user: this.user,
      service: {
        fetch: `${this.entrypoint}/files/${this.file.guid}/comments?accessToken=${this.token}`,
        create: `${this.entrypoint}/files/${this.file.guid}/comments?accessToken=${this.token}`,
        delete: `${this.entrypoint}/files/${this.file.guid}/comments/{commentGuid}?accessToken=${this.token}`,
        close: `${this.entrypoint}/files/${this.file.guid}/` +
          `comments/close/{selectionGuid}?accessToken=${this.token}`
      },
      mentionable: false
    }

    const comment: ShimoSDK.Document.Comment = new this.sdkDocument.plugins.Comment(options)
    editor.comment = comment
    comment.render()
    comment.show()
  }

  public initDemoScreen (editor: ShimoSDK.Document.Editor): ShimoSDK.Document.DemoScreen {
    const options: ShimoSDK.Document.DemoScreenOptions = { editor }

    const demoScreen: ShimoSDK.Document.DemoScreen = new this.sdkDocument.plugins.DemoScreen(options)
    return demoScreen
  }

  public initUploader (editor: ShimoSDK.Document.Editor): ShimoSDK.Document.Uploader {
    const uploadConfig: { [key: string]: any } = assign({}, this.plugins.Uploader)

    const options: ShimoSDK.Document.UploaderOptions = {
      editor,
      container: '#sm-editor',
      url: uploadConfig.origin,
      accessToken: uploadConfig.token,
      type: uploadConfig.server
    }

    return new this.sdkDocument.plugins.Uploader(options)
  }

  public initShortcut (editor: ShimoSDK.Document.Editor): void {
    const options: ShimoSDK.Document.ShortcutOptions = {
      editor,
      plugins: {
        demoScreen: undefined,
        revision: undefined,
        history: undefined,
        tableOfContent: undefined
      }
    }

    const shortcut: ShimoSDK.Document.Shortcut = new this.sdkDocument.plugins.Shortcut(options)
    shortcut.render()
  }

  private getToolbarOptions () {
    let container: HTMLElement | null

    if (!this.plugins.Toolbar) {
      return false
    }

    container = this.getElement((this.plugins.Toolbar as ShimoSDK.Document.ToolbarOptions).container)

    if (!container) {
      container = this.getElement(undefined, 'div', { id: 'sm-toolbar' })
      this.element.insertBefore(container, this.element.firstChild)
    }

    container.classList.add('sm-toolbar')

    return { parent: container }
  }
}

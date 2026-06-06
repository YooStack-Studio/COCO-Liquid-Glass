/**
 * Cocyper 液态玻璃控件
 * 基于 Shu Ding 的 liquid-glass Vanilla JS 实现，使用 Canvas 渲染位移贴图 + SVG feDisplacementMap
 * 颜色使用 Hor-Hyper_模式 CSS 变量
 */

var document = this.document
var window = this.window

// Cocyper 液态玻璃控件类型定义
const types = {
  title: '液态玻璃',
  type: 'COCYPER_LIQUID_GLASS',
  icon: 'https://static.codemao.cn/appcraft/extension-widgets/production/blink-button.svg',
  docs: { url: '' },
  version: '2.0.0',
  isInvisibleWidget: false,
  isGlobalWidget: false,
  hasAnyWidget: true,
  properties: [
    {
      key: 'shape',
      label: '形状',
      valueType: 'string',
      defaultValue: 'rounded',
      dropdown: [
        { label: '圆形', value: 'circle' },
        { label: '圆角矩形', value: 'rounded' }
      ]
    },
    {
      key: 'borderRadius',
      label: '圆角大小',
      valueType: 'number',
      defaultValue: 80,
      unit: '像素'
    },
    {
      key: 'blur',
      label: '模糊度',
      valueType: 'number',
      defaultValue: 0.25
    },
    {
      key: 'contrast',
      label: '对比度',
      valueType: 'number',
      defaultValue: 1.2
    },
    {
      key: 'brightness',
      label: '亮度',
      valueType: 'number',
      defaultValue: 1.05
    },
    {
      key: 'saturate',
      label: '饱和度',
      valueType: 'number',
      defaultValue: 1.1
    },
    {
      key: 'displaceScale',
      label: '变形强度',
      valueType: 'number',
      defaultValue: 1.0
    },
    {
      key: 'mouseInfluence',
      label: '鼠标影响',
      valueType: 'number',
      defaultValue: 0.3,
      blockOptions: { setter: { space: 40 } }
    },
    {
      key: 'canvasDPI',
      label: '渲染精度',
      valueType: 'number',
      defaultValue: 0.5,
      blockOptions: { setter: { line: '性能' } }
    },
    {
      key: 'showIcon',
      label: '显示图标',
      valueType: 'string',
      defaultValue: 'none',
      dropdown: [
        { label: '无', value: 'none' },
        { label: '加号', value: 'plus' },
        { label: '对勾', value: 'check' }
      ]
    },
    {
      key: 'iconColor',
      label: '图标颜色',
      valueType: 'color',
      defaultValue: 'var(--hm-color-theme-btn-text)'
    },
    {
      key: 'iconSize',
      label: '图标尺寸',
      valueType: 'number',
      defaultValue: 40,
      unit: '像素',
      blockOptions: { setter: { line: '图标' } }
    },
    {
      key: 'content',
      label: '内容文本',
      valueType: 'string',
      defaultValue: ''
    },
    {
      key: 'contentSize',
      label: '文字字号',
      valueType: 'number',
      defaultValue: 18,
      unit: '像素'
    },
    {
      key: 'contentColor',
      label: '文字颜色',
      valueType: 'color',
      defaultValue: 'var(--hm-color-theme-btn-text)'
    },
    {
      key: 'contentWeight',
      label: '文字字重',
      valueType: 'number',
      defaultValue: 500
    },
    {
      key: 'disabled',
      label: '状态',
      valueType: 'string',
      defaultValue: 'false',
      dropdown: [
        { label: '启用', value: 'false' },
        { label: '禁用', value: 'true' }
      ]
    },
    {
      key: 'draggable',
      label: '允许拖拽',
      valueType: 'boolean',
      defaultValue: false
    },
    {
      key: 'screenAlign',
      label: '屏幕适配',
      defaultValue: 'top',
      valueType: 'string',
      dropdown: [
        { label: '顶部对齐', value: 'top' },
        { label: '底部对齐', value: 'bottom' }
      ],
      blockOptions: { generateBlock: false }
    },
    {
      key: '__width',
      label: '宽度',
      valueType: 'number',
      defaultValue: 300,
      blockOptions: { generateBlock: false }
    },
    {
      key: '__height',
      label: '高度',
      valueType: 'number',
      defaultValue: 200,
      blockOptions: { generateBlock: false }
    },
    {
      key: '__size',
      label: '',
      valueType: 'number',
      defaultValue: 100,
      readonly: true,
      blockOptions: {
        setter: { keys: ['__height', '__width'], line: '通用' },
        getter: { keys: ['__height', '__width'] }
      }
    }
  ],
  events: [
    {
      key: 'on',
      label: '被',
      subTypes: [
        {
          key: 'event',
          dropdown: [
            { label: '点击', value: 'Click' },
            { label: '悬停', value: 'Hover' },
            { label: '离开', value: 'Leave' }
          ]
        }
      ],
      params: []
    }
  ],
  methods: [
    {
      key: 'updateDisplacementMap',
      label: '刷新玻璃',
      tooltip: '手动刷新液态玻璃变形效果',
      params: [],
      blockOptions: { setter: { line: '基础' } }
    },
    {
      key: 'getWidgetId',
      label: '的 ID',
      valueType: 'string',
      params: [],
      blockOptions: { color: '#2FD16C', callMethodLabel: false }
    }
  ]
}

/**
 * 平滑阶跃函数
 * @param {number} a - 下限
 * @param {number} b - 上限
 * @param {number} t - 输入值
 * @returns {number} 0 到 1 之间的平滑插值
 */
function smoothStep(a, b, t) {
  t = Math.max(0, Math.min(1, (t - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

/**
 * 向量长度
 * @param {number} x - X分量
 * @param {number} y - Y分量
 * @returns {number} 欧几里得长度
 */
function length(x, y) {
  return Math.sqrt(x * x + y * y)
}

/**
 * 圆角矩形 SDF (Signed Distance Function)
 * @param {number} x - 当前点X坐标（相对于中心）
 * @param {number} y - 当前点Y坐标（相对于中心）
 * @param {number} w - 半宽
 * @param {number} h - 半高
 * @param {number} r - 圆角半径
 * @returns {number} 到边界的距离（内部为负，外部为正）
 */
function roundedRectSDF(x, y, w, h, r) {
  var qx = Math.abs(x) - w + r
  var qy = Math.abs(y) - h + r
  return Math.min(Math.max(qx, qy), 0) + length(Math.max(qx, 0), Math.max(qy, 0)) - r
}

/**
 * Cocyper 液态玻璃控件实体类
 * 继承自 VisibleWidget，属性直接挂在 this 上
 * 使用 Canvas 生成位移贴图 + SVG feDisplacementMap 实现液态变形
 */
class CocyperLiquidGlassWidget extends VisibleWidget {
  /**
   * 构造函数，将传入的 props 合并到实例上
   * @param {Object} props - 控件属性对象
   */
  constructor(props) {
    super(props)
    Object.assign(this, props)
    // 内部状态
    this._mouseX = 0.5
    this._mouseY = 0.5
    this._mouseOver = false
    this._rafId = null
    this._filterId = 'lg_' + this.__widgetId
    this._mapId = 'lg_map_' + this.__widgetId
    this._dispId = 'lg_disp_' + this.__widgetId
    this._glassId = 'lg_glass_' + this.__widgetId
  }

  /**
   * 控件挂载后初始化 Canvas 和鼠标监听
   */
  componentDidMount() {
    var self = this
    var glassEl = document.getElementById(this._glassId)
    if (!glassEl) return

    // 监听玻璃元素上的鼠标移动
    glassEl.addEventListener('mousemove', function (e) {
      var rect = glassEl.getBoundingClientRect()
      self._mouseX = (e.clientX - rect.left) / rect.width
      self._mouseY = (e.clientY - rect.top) / rect.height
      self._mouseOver = true
      self.scheduleUpdate()
    })

    glassEl.addEventListener('mouseleave', function () {
      self._mouseOver = false
      self.scheduleUpdate()
    })

    // 初始化渲染一次
    this._pendingUpdate = true
    this.scheduleUpdate()

    // 拖拽支持
    if (this.draggable) {
      this._setupDrag(glassEl)
    }
  }

  /**
   * 控件卸载前清理资源
   */
  componentWillUnmount() {
    if (this._rafId) {
      window.cancelAnimationFrame(this._rafId)
      this._rafId = null
    }
    this._pendingUpdate = false
  }

  /**
   * props 更新后刷新贴图
   * @param {Object} prevProps - 之前的 props
   */
  componentDidUpdate(prevProps) {
    this._pendingUpdate = true
    this.scheduleUpdate()
  }

  /**
   * 延迟调度 Canvas 更新（合并连续调用）
   */
  scheduleUpdate() {
    if (this._rafId || !this._pendingUpdate) return
    var self = this
    this._pendingUpdate = false
    this._rafId = window.requestAnimationFrame(function () {
      self._rafId = null
      self.renderDisplacementMap()
      if (self._pendingUpdate) {
        self.scheduleUpdate()
      }
    })
  }

  /**
   * 渲染位移贴图到 Canvas，并更新 SVG feImage
   */
  renderDisplacementMap() {
    var canvas = document.getElementById(this._mapId + '_canvas')
    var feImage = document.getElementById(this._mapId)
    var feDisp = document.getElementById(this._dispId)
    if (!canvas || !feImage || !feDisp) return

    var dpi = this.canvasDPI !== undefined ? this.canvasDPI : 0.5
    var width = this.__width || 300
    var height = this.__height || 200
    var w = Math.round(width * dpi)
    var h = Math.round(height * dpi)

    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }

    var ctx = canvas.getContext('2d')
    var data = ctx.createImageData(w, h)
    var px = data.data

    var shape = this.shape || 'rounded'
    var borderRadius = this.borderRadius !== undefined ? this.borderRadius : 80
    var displaceScale = this.displaceScale !== undefined ? this.displaceScale : 1.0
    var mouseInfluence = this.mouseInfluence !== undefined ? this.mouseInfluence : 0.3
    var mx = this._mouseX
    var my = this._mouseY

    // 计算 SDF 参数（归一化到 [-0.5, 0.5] 范围）
    var halfW = 0.5
    var halfH = 0.5

    if (shape === 'circle') {
      // 圆形：SDF 半径 = min(w,h)/2，归一化
      var minDim = Math.min(width, height)
      var r = (minDim / 2) / Math.max(width, height)
      // 简化：直接使用圆心距离
      halfW = 0.48
      halfH = 0.48
      borderRadius = Math.min(0.48, borderRadius / Math.min(width, height) * 2 * 0.5)
    } else {
      halfW = 0.48
      halfH = 0.48
      borderRadius = Math.min(0.48, borderRadius / Math.min(width, height) * 2 * 0.5)
    }

    // 收集所有像素的位移值，用于归一化
    var rawValues = []
    var maxScale = 0

    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var ux = x / w - 0.5
        var uy = y / h - 0.5

        // 使用圆角矩形 SDF 计算到边界的距离
        var dist = roundedRectSDF(ux, uy, halfW, halfH, borderRadius)

        // 鼠标影响：距离鼠标越近，位移越大
        var mouseDist = Math.sqrt(
          (ux - (mx - 0.5)) * (ux - (mx - 0.5)) +
          (uy - (my - 0.5)) * (uy - (my - 0.5))
        )
        var mouseEffect = 1 + mouseInfluence * Math.max(0, 1 - mouseDist * 4)

        // 核心：在边界附近产生位移（液态变形）
        var displacement = smoothStep(0.1, -0.05, dist)

        var dx = ux * displacement * displaceScale * mouseEffect
        var dy = uy * displacement * displaceScale * mouseEffect

        maxScale = Math.max(maxScale, Math.abs(dx), Math.abs(dy))
        rawValues.push(dx, dy)
      }
    }

    maxScale = Math.max(maxScale * 0.5, 0.001)

    // 写入 RGBA 像素数据
    var idx = 0
    for (var i = 0; i < px.length; i += 4) {
      var rVal = rawValues[idx++] / maxScale + 0.5
      var gVal = rawValues[idx++] / maxScale + 0.5
      px[i] = Math.max(0, Math.min(255, Math.round(rVal * 255)))
      px[i + 1] = Math.max(0, Math.min(255, Math.round(gVal * 255)))
      px[i + 2] = 0
      px[i + 3] = 255
    }

    ctx.putImageData(data, 0, 0)

    // 更新 feImage 的 href 指向 canvas 的 data URL
    var dataUrl = canvas.toDataURL()
    feImage.setAttributeNS('http://www.w3.org/1999/xlink', 'href', dataUrl)
    // 同时更新 feDisplacementMap 的 scale
    feDisp.setAttribute('scale', (maxScale * displaceScale / dpi).toFixed(2))
  }

  /**
   * 手动刷新玻璃变形效果
   */
  updateDisplacementMap() {
    this._pendingUpdate = true
    this.scheduleUpdate()
  }

  /**
   * 触发事件
   * @param {string} name - 事件名称后缀
   */
  onEvent(name) {
    this.emit('on' + name)
  }

  /**
   * 设置拖拽支持
   * @param {HTMLElement} el - 玻璃元素
   */
  _setupDrag(el) {
    var self = this
    var isDragging = false
    var startX, startY, initialLeft, initialTop

    el.addEventListener('mousedown', function (e) {
      if (self.disabled === 'true') return
      isDragging = true
      startX = e.clientX
      startY = e.clientY
      initialLeft = el.offsetLeft
      initialTop = el.offsetTop
      e.preventDefault()
    })

    document.addEventListener('mousemove', function (e) {
      if (!isDragging) return
      var dX = e.clientX - startX
      var dY = e.clientY - startY
      var newLeft = initialLeft + dX
      var newTop = initialTop + dY
      // 限制在视口内
      var vw = window.innerWidth
      var vh = window.innerHeight
      newLeft = Math.max(10, Math.min(vw - el.offsetWidth - 10, newLeft))
      newTop = Math.max(10, Math.min(vh - el.offsetHeight - 10, newTop))
      el.style.left = newLeft + 'px'
      el.style.top = newTop + 'px'
      el.style.transform = 'none'
    })

    document.addEventListener('mouseup', function () {
      isDragging = false
    })
  }

  /**
   * 渲染内部图标
   * @param {string} iconType - 图标类型
   * @param {string} iconColor - 图标颜色
   * @param {number} iconSize - 图标尺寸
   * @returns {JSX.Element|null} 图标 JSX
   */
  renderIcon(iconType, iconColor, iconSize) {
    if (iconType === 'plus') {
      var half = (iconSize / 2) + 'px'
      var barLen = (iconSize * 0.4) + 'px'
      var barOff = ((100 - 40) / 2) + '%'
      var thick = '3px'
      return (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
          <span style={{
            position: 'absolute', width: barLen, height: thick,
            background: iconColor, borderRadius: '2px',
            top: '50%', left: barOff,
            transform: 'translateY(-1.5px)', pointerEvents: 'none'
          }} />
          <span style={{
            position: 'absolute', width: thick, height: barLen,
            background: iconColor, borderRadius: '2px',
            left: '50%', top: barOff,
            transform: 'translateX(-1.5px)', pointerEvents: 'none'
          }} />
        </div>
      )
    }
    if (iconType === 'check') {
      return (
        <span style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: iconColor, pointerEvents: 'none'
        }}
          dangerouslySetInnerHTML={{
            __html: '<svg xmlns="http://www.w3.org/2000/svg" width="' + iconSize + '" height="' + iconSize + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>'
          }}
        />
      )
    }
    return null
  }

  /**
   * 渲染控件 UI
   * @returns {JSX.Element} 控件 JSX
   */
  render() {
    var shape = this.shape || 'rounded'
    var borderRadius = this.borderRadius !== undefined ? this.borderRadius : 80
    var width = this.__width || 300
    var height = this.__height || 200
    var blur = this.blur !== undefined ? this.blur : 0.25
    var contrast = this.contrast !== undefined ? this.contrast : 1.2
    var brightness = this.brightness !== undefined ? this.brightness : 1.05
    var saturate = this.saturate !== undefined ? this.saturate : 1.1
    var showIcon = this.showIcon || 'none'
    var iconColor = this.iconColor || 'var(--hm-color-theme-btn-text)'
    var iconSize = this.iconSize !== undefined ? this.iconSize : 40
    var content = this.content || ''
    var contentSize = this.contentSize !== undefined ? this.contentSize : 18
    var contentColor = this.contentColor || 'var(--hm-color-theme-btn-text)'
    var contentWeight = this.contentWeight !== undefined ? this.contentWeight : 500
    var disabled = this.disabled || 'false'
    var dpi = this.canvasDPI !== undefined ? this.canvasDPI : 0.5

    var self = this
    var radiusValue = shape === 'circle' ? '50%' : borderRadius + 'px'
    var canvasW = Math.round(width * dpi)
    var canvasH = Math.round(height * dpi)

    return (
      <div className={'hm_' + this.__widgetId}>
        {/* SVG 滤镜定义 */}
        <svg xmlns="http://www.w3.org/2000/svg"
          style={{ position: 'fixed', top: 0, left: 0, width: 0, height: 0, pointerEvents: 'none' }}>
          <defs>
            <filter id={this._filterId}
              filterUnits="userSpaceOnUse"
              colorInterpolationFilters="sRGB"
              x="0" y="0"
              width={width} height={height}>
              {/* Canvas 渲染的位移贴图 */}
              <feImage id={this._mapId} width={width} height={height}
                href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
              />
              {/* 位移映射 */}
              <feDisplacementMap id={this._dispId}
                in="SourceGraphic"
                in2={this._mapId}
                scale="1"
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          </defs>
        </svg>

        {/* 隐藏的 Canvas（用于生成位移贴图） */}
        <canvas id={this._mapId + '_canvas'}
          width={canvasW} height={canvasH}
          style={{ display: 'none' }}
        />

        {/* 液态玻璃主体 */}
        <div
          id={this._glassId}
          className={'hm_' + this.__widgetId + '_glass'}
          style={{
            width: width + 'px',
            height: height + 'px',
            borderRadius: radiusValue,
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.25), inset 0 -10px 25px rgba(0, 0, 0, 0.15)',
            backdropFilter: 'url(#' + this._filterId + ') blur(' + blur + 'px) contrast(' + contrast + ') brightness(' + brightness + ') saturate(' + saturate + ')',
            WebkitBackdropFilter: 'url(#' + this._filterId + ') blur(' + blur + 'px) contrast(' + contrast + ') brightness(' + brightness + ') saturate(' + saturate + ')',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: disabled === 'true' ? 'not-allowed' : 'pointer',
            outline: 'none',
            position: 'relative',
            overflow: 'hidden',
            opacity: disabled === 'true' ? 0.55 : 1,
            transition: 'opacity 0.2s ease'
          }}
          onClick={function () { if (disabled !== 'true') self.onEvent('Click') }}
          onMouseEnter={function () { if (disabled !== 'true') self.onEvent('Hover') }}
          onMouseLeave={function () { if (disabled !== 'true') self.onEvent('Leave') }}
        >
          {/* 内部图标 */}
          {this.renderIcon(showIcon, iconColor, iconSize)}

          {/* 内容文本 */}
          {content ? (
            <span style={{
              color: contentColor,
              fontSize: contentSize + 'px',
              fontWeight: contentWeight,
              fontFamily: '"MiSans VF", sans-serif',
              position: 'relative',
              zIndex: 1,
              textAlign: 'center',
              padding: '0 16px',
              pointerEvents: 'none'
            }}>
              {content}
            </span>
          ) : null}
        </div>
      </div>
    )
  }

  /**
   * 返回控件的 ID
   * @returns {string} 控件唯一标识
   */
  getWidgetId() {
    return this.__widgetId
  }
}

exports.types = types
exports.widget = CocyperLiquidGlassWidget

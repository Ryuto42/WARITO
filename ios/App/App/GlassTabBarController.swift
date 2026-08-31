import UIKit
import WebKit
import Capacitor

class GlassTabBarController: CAPBridgeViewController, WKScriptMessageHandler {

    private let barContainer = UIView()
    private var pillEffectView: UIVisualEffectView!
    private var addEffectView: UIVisualEffectView!
    private var selectionIndicator: UIVisualEffectView!
    private var tabButtons: [UIButton] = []
    private var searchButton: UIButton!
    private var accountButton: UIButton!
    private var termButton: UIButton!
    private var presetDotsView: UIVisualEffectView!
    private var presetDotsStack: UIStackView!
    private var presetCount = 0
    private var presetIndex = 0
    private var glassControlsVisible = false

    private let tabs: [(key: String, title: String)] = [
        ("timetable", "時間割"),
        ("grades", "成績"),
    ]
    private var activeTab = "timetable"

    private let pillWidth: CGFloat = 256
    private let barHeight: CGFloat = 56
    private let gap: CGFloat = 12
    private let inset: CGFloat = 6

    private var topControlSize: CGFloat {
        UIScreen.main.bounds.width >= 640 ? 48 : 40
    }

    private var topControlInset: CGFloat {
        UIScreen.main.bounds.width >= 640 ? 24 : 16
    }

    private var topIconSize: CGFloat {
        UIScreen.main.bounds.width >= 640 ? 24 : 20
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        webView?.configuration.userContentController.add(self, name: "waritoTabBar")
        webView?.configuration.userContentController.add(self, name: "waritoGlassControls")
        setupBar()
        setupGlassControls()
    }

    // MARK: - 構築

    private func setupBar() {
        barContainer.translatesAutoresizingMaskIntoConstraints = false
        barContainer.isUserInteractionEnabled = true
        barContainer.alpha = 0
        view.addSubview(barContainer)

        NSLayoutConstraint.activate([
            barContainer.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            barContainer.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -20),
            barContainer.heightAnchor.constraint(equalToConstant: barHeight),
            barContainer.widthAnchor.constraint(equalToConstant: pillWidth + gap + barHeight),
        ])

        pillEffectView = makeGlassView(corner: barHeight / 2)
        addEffectView = makeGlassView(corner: barHeight / 2)
        barContainer.addSubview(pillEffectView)
        barContainer.addSubview(addEffectView)

        NSLayoutConstraint.activate([
            pillEffectView.leadingAnchor.constraint(equalTo: barContainer.leadingAnchor),
            pillEffectView.topAnchor.constraint(equalTo: barContainer.topAnchor),
            pillEffectView.bottomAnchor.constraint(equalTo: barContainer.bottomAnchor),
            pillEffectView.widthAnchor.constraint(equalToConstant: pillWidth),

            addEffectView.trailingAnchor.constraint(equalTo: barContainer.trailingAnchor),
            addEffectView.topAnchor.constraint(equalTo: barContainer.topAnchor),
            addEffectView.bottomAnchor.constraint(equalTo: barContainer.bottomAnchor),
            addEffectView.widthAnchor.constraint(equalToConstant: barHeight),
        ])

        setupPillContents()
        setupAddButton()
    }

    private func makeGlassView(corner: CGFloat, clear: Bool = false) -> UIVisualEffectView {
        let effect: UIVisualEffect
        if #available(iOS 26.0, *) {
            let glass = UIGlassEffect(style: clear ? .clear : .regular)
            glass.isInteractive = true
            if clear {
                glass.tintColor = UIColor.systemBlue.withAlphaComponent(0.12)
            }
            effect = glass
        } else {
            effect = UIBlurEffect(style: .systemThinMaterial)
        }
        let v = UIVisualEffectView(effect: effect)
        v.translatesAutoresizingMaskIntoConstraints = false
        v.clipsToBounds = true
        v.layer.cornerRadius = corner
        v.layer.cornerCurve = .continuous
        return v
    }

    private func setupPillContents() {
        let content = pillEffectView.contentView

        selectionIndicator = makeGlassView(corner: (barHeight - inset * 2) / 2, clear: true)
        selectionIndicator.translatesAutoresizingMaskIntoConstraints = false
        content.addSubview(selectionIndicator)

        let stack = UIStackView()
        stack.axis = .horizontal
        stack.distribution = .fillEqually
        stack.translatesAutoresizingMaskIntoConstraints = false
        content.addSubview(stack)

        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: content.leadingAnchor),
            stack.trailingAnchor.constraint(equalTo: content.trailingAnchor),
            stack.topAnchor.constraint(equalTo: content.topAnchor),
            stack.bottomAnchor.constraint(equalTo: content.bottomAnchor),
        ])

        for (index, tab) in tabs.enumerated() {
            let b = UIButton(type: .system)
            b.setTitle(tab.title, for: .normal)
            b.titleLabel?.font = .systemFont(ofSize: 12, weight: .bold)
            b.tag = index
            b.addTarget(self, action: #selector(tabTapped(_:)), for: .touchUpInside)
            stack.addArrangedSubview(b)
            tabButtons.append(b)
        }

        updateSelection(animated: false)
    }

    private func setupAddButton() {
        let b = UIButton(type: .system)
        b.translatesAutoresizingMaskIntoConstraints = false
        b.setImage(UIImage(systemName: "plus", withConfiguration:
            UIImage.SymbolConfiguration(pointSize: 24, weight: .regular)), for: .normal)
        b.tintColor = .label
        b.addTarget(self, action: #selector(addTapped), for: .touchUpInside)
        addEffectView.contentView.addSubview(b)
        NSLayoutConstraint.activate([
            b.leadingAnchor.constraint(equalTo: addEffectView.contentView.leadingAnchor),
            b.trailingAnchor.constraint(equalTo: addEffectView.contentView.trailingAnchor),
            b.topAnchor.constraint(equalTo: addEffectView.contentView.topAnchor),
            b.bottomAnchor.constraint(equalTo: addEffectView.contentView.bottomAnchor),
        ])
    }

    private func setupGlassControls() {
        searchButton = makeGlassButton(
            imageName: "magnifyingglass",
            accessibilityLabel: "授業を検索"
        )
        searchButton.addTarget(self, action: #selector(searchTapped), for: .touchUpInside)

        accountButton = makeGlassButton(
            imageName: "person",
            accessibilityLabel: "アカウント"
        )
        accountButton.addTarget(self, action: #selector(accountTapped), for: .touchUpInside)

        termButton = makeTermButton()
        termButton.addTarget(self, action: #selector(termTapped), for: .touchUpInside)

        presetDotsView = makeGlassView(corner: 14)
        presetDotsStack = UIStackView()
        presetDotsStack.axis = .horizontal
        presetDotsStack.alignment = .center
        presetDotsStack.spacing = 8
        presetDotsStack.translatesAutoresizingMaskIntoConstraints = false
        presetDotsView.contentView.addSubview(presetDotsStack)

        view.addSubview(searchButton)
        view.addSubview(accountButton)
        view.addSubview(termButton)
        view.addSubview(presetDotsView)

        NSLayoutConstraint.activate([
            searchButton.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: topControlInset),
            searchButton.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 16),
            searchButton.widthAnchor.constraint(equalToConstant: topControlSize),
            searchButton.heightAnchor.constraint(equalToConstant: topControlSize),

            accountButton.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -topControlInset),
            accountButton.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 16),
            accountButton.widthAnchor.constraint(equalToConstant: topControlSize),
            accountButton.heightAnchor.constraint(equalToConstant: topControlSize),

            termButton.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            termButton.bottomAnchor.constraint(equalTo: barContainer.topAnchor, constant: -20),
            termButton.heightAnchor.constraint(greaterThanOrEqualToConstant: 34),

            presetDotsView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            presetDotsView.topAnchor.constraint(equalTo: searchButton.bottomAnchor, constant: 34),
            presetDotsView.heightAnchor.constraint(equalToConstant: 28),

            presetDotsStack.leadingAnchor.constraint(equalTo: presetDotsView.contentView.leadingAnchor, constant: 14),
            presetDotsStack.trailingAnchor.constraint(equalTo: presetDotsView.contentView.trailingAnchor, constant: -14),
            presetDotsStack.centerYAnchor.constraint(equalTo: presetDotsView.contentView.centerYAnchor),
        ])

        searchButton.alpha = 0
        accountButton.alpha = 0
        termButton.alpha = 0
        presetDotsView.alpha = 0
        searchButton.isUserInteractionEnabled = false
        accountButton.isUserInteractionEnabled = false
        termButton.isUserInteractionEnabled = false
        updateTermTitle(year: 2026, semester: "春学期")
        updateControlAppearance()
    }

    private func makeGlassButton(imageName: String, accessibilityLabel: String) -> UIButton {
        let button = UIButton(type: .system)
        button.translatesAutoresizingMaskIntoConstraints = false
        button.accessibilityLabel = accessibilityLabel
        button.accessibilityTraits = .button

        let symbol = UIImage(
            systemName: imageName,
            withConfiguration: UIImage.SymbolConfiguration(pointSize: topIconSize, weight: .medium)
        )

        if #available(iOS 26.0, *) {
            var configuration = UIButton.Configuration.glass()
            configuration.cornerStyle = .capsule
            configuration.contentInsets = .zero
            configuration.image = symbol
            configuration.baseForegroundColor = .label
            button.configuration = configuration
        } else {
            button.setImage(symbol, for: .normal)
            button.tintColor = .label
            button.backgroundColor = UIColor.secondarySystemBackground.withAlphaComponent(0.78)
            button.layer.cornerRadius = topControlSize / 2
            button.layer.cornerCurve = .continuous
        }

        return button
    }

    private func makeTermButton() -> UIButton {
        let button = UIButton(type: .system)
        button.translatesAutoresizingMaskIntoConstraints = false
        button.accessibilityLabel = "学期を変更"
        button.accessibilityTraits = .button

        if #available(iOS 26.0, *) {
            var configuration = UIButton.Configuration.glass()
            configuration.cornerStyle = .capsule
            configuration.imagePlacement = .trailing
            configuration.imagePadding = 5
            configuration.contentInsets = NSDirectionalEdgeInsets(top: 7, leading: 14, bottom: 7, trailing: 12)
            configuration.image = UIImage(
                systemName: "chevron.down",
                withConfiguration: UIImage.SymbolConfiguration(pointSize: 14, weight: .semibold)
            )
            configuration.baseForegroundColor = .label
            configuration.titleTextAttributesTransformer = UIConfigurationTextAttributesTransformer { incoming in
                var outgoing = incoming
                outgoing.font = .systemFont(ofSize: 12, weight: .semibold)
                return outgoing
            }
            button.configuration = configuration
        } else {
            button.tintColor = .label
            button.backgroundColor = UIColor.secondarySystemBackground.withAlphaComponent(0.78)
            button.layer.cornerRadius = 17
            button.layer.cornerCurve = .continuous
        }

        return button
    }

    private func updateTermTitle(year: Int, semester: String) {
        let title = "\(year)年度  \(semester)"
        if var configuration = termButton?.configuration {
            configuration.title = title
            termButton.configuration = configuration
        } else {
            termButton?.setTitle(title, for: .normal)
        }
    }

    private func updateControlAppearance() {
        let isAccount = activeTab == "account"
        if #available(iOS 26.0, *) {
            if var configuration = accountButton?.configuration {
                configuration.baseForegroundColor = isAccount ? .systemBlue : .label
                accountButton.configuration = configuration
            }
        } else {
            accountButton?.tintColor = isAccount ? .systemBlue : .label
        }
    }

    // MARK: - 選択状態

    private func updateSelection(animated: Bool) {
        let index = tabs.firstIndex { $0.key == activeTab }
        for (i, b) in tabButtons.enumerated() {
            b.setTitleColor(i == index ? .systemBlue : .secondaryLabel, for: .normal)
        }

        let half = pillWidth / 2
        let w = half - inset * 2
        let x = (index == 1) ? half + inset : inset
        let frame = CGRect(x: x, y: inset, width: w, height: barHeight - inset * 2)

        let apply = {
            self.selectionIndicator.frame = frame
            self.selectionIndicator.layer.cornerRadius = frame.height / 2
            self.selectionIndicator.alpha = (index == nil) ? 0 : 1
        }
        if animated {
            UIView.animate(withDuration: 0.44, delay: 0,
                           usingSpringWithDamping: 0.78, initialSpringVelocity: 0.4,
                           options: [.allowUserInteraction, .beginFromCurrentState], animations: apply)

            selectionIndicator.transform = .identity
            UIView.animateKeyframes(withDuration: 0.44, delay: 0,
                                    options: [.allowUserInteraction, .beginFromCurrentState], animations: {
                UIView.addKeyframe(withRelativeStartTime: 0, relativeDuration: 0.38) {
                    self.selectionIndicator.transform = CGAffineTransform(scaleX: 1.13, y: 0.93)
                }
                UIView.addKeyframe(withRelativeStartTime: 0.38, relativeDuration: 0.32) {
                    self.selectionIndicator.transform = CGAffineTransform(scaleX: 0.98, y: 1.02)
                }
                UIView.addKeyframe(withRelativeStartTime: 0.70, relativeDuration: 0.30) {
                    self.selectionIndicator.transform = .identity
                }
            })
        } else {
            apply()
            selectionIndicator.transform = .identity
        }
    }

    // MARK: - 入力

    @objc private func tabTapped(_ sender: UIButton) {
        let key = tabs[sender.tag].key
        guard key != activeTab else { return }
        activeTab = key
        updateSelection(animated: true)
        updateControlAppearance()
        updateTermVisibility()
        UISelectionFeedbackGenerator().selectionChanged()
        callJS("window.__waritoNativeTab && window.__waritoNativeTab('\(key)')")
    }

    @objc private func addTapped() {
        UISelectionFeedbackGenerator().selectionChanged()
        callJS("window.__waritoNativeAdd && window.__waritoNativeAdd()")
    }

    @objc private func searchTapped() {
        UISelectionFeedbackGenerator().selectionChanged()
        callJS("window.__waritoNativeGlassSearch && window.__waritoNativeGlassSearch()")
    }

    @objc private func accountTapped() {
        UISelectionFeedbackGenerator().selectionChanged()
        callJS("window.__waritoNativeGlassAccount && window.__waritoNativeGlassAccount()")
    }

    @objc private func termTapped() {
        UISelectionFeedbackGenerator().selectionChanged()
        callJS("window.__waritoNativeGlassTerm && window.__waritoNativeGlassTerm()")
    }

    private func callJS(_ script: String) {
        webView?.evaluateJavaScript(script, completionHandler: nil)
    }

    // MARK: - Web からの状態同期

    func userContentController(_ controller: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let body = message.body as? [String: Any] else { return }

        if message.name == "waritoTabBar" {
            if let tab = body["activeTab"] as? String, tab != activeTab {
                activeTab = tab
                updateSelection(animated: true)
                updateControlAppearance()
                updateTermVisibility()
            }
            if let visible = body["visible"] as? Bool {
                let target: CGFloat = visible ? 1 : 0
                if barContainer.alpha != target {
                    UIView.animate(withDuration: 0.2) { self.barContainer.alpha = target }
                }
                barContainer.isUserInteractionEnabled = visible
            }
            return
        }

        guard message.name == "waritoGlassControls" else { return }

        if let tab = body["activeTab"] as? String, tab != activeTab {
            activeTab = tab
            updateSelection(animated: true)
            updateControlAppearance()
            updatePresetDotsVisibility()
        }
        if let year = body["year"] as? Int,
           let semester = body["semester"] as? String {
            updateTermTitle(year: year, semester: semester)
        }
        let newCount = body["presetCount"] as? Int ?? presetCount
        let newIndex = body["presetIndex"] as? Int ?? presetIndex
        if newCount != presetCount || newIndex != presetIndex {
            presetCount = newCount
            presetIndex = newIndex
            rebuildPresetDots()
        }
        updatePresetDotsVisibility()
        if let visible = body["visible"] as? Bool {
            glassControlsVisible = visible
            let target: CGFloat = visible ? 1 : 0
            UIView.animate(withDuration: 0.2) {
                self.searchButton.alpha = target
                self.accountButton.alpha = target
                self.updateTermVisibility()
                self.updatePresetDotsVisibility()
            }
            searchButton.isUserInteractionEnabled = visible
            accountButton.isUserInteractionEnabled = visible
            termButton.isUserInteractionEnabled = visible && activeTab == "timetable"
        }
    }

    private func rebuildPresetDots() {
        presetDotsStack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        let pageCount = presetCount + 1
        guard presetCount >= 1 else { return }

        for i in 0..<pageCount {
            let dot = UIButton(type: .system)
            dot.tag = i
            dot.translatesAutoresizingMaskIntoConstraints = false
            dot.addTarget(self, action: #selector(presetDotTapped(_:)), for: .touchUpInside)
            let active = i == presetIndex
            let isAddPage = i == presetCount
            dot.backgroundColor = active
                ? UIColor.systemBlue
                : UIColor.label.withAlphaComponent(isAddPage ? 0.16 : 0.28)
            dot.layer.cornerRadius = 3
            NSLayoutConstraint.activate([
                dot.heightAnchor.constraint(equalToConstant: 6),
                dot.widthAnchor.constraint(equalToConstant: active ? 20 : 6),
            ])
            presetDotsStack.addArrangedSubview(dot)
        }
    }

    @objc private func presetDotTapped(_ sender: UIButton) {
        guard sender.tag != presetIndex else { return }
        presetIndex = sender.tag
        rebuildPresetDots()
        UISelectionFeedbackGenerator().selectionChanged()
        callJS("window.__waritoNativeGlassPreset && window.__waritoNativeGlassPreset(\(sender.tag))")
    }

    private func updatePresetDotsVisibility() {
        guard presetDotsView != nil else { return }
        let show = glassControlsVisible && activeTab == "timetable" && presetCount >= 1
        presetDotsView.alpha = show ? 1 : 0
        presetDotsView.isUserInteractionEnabled = show
    }

    private func updateTermVisibility() {
        guard termButton != nil else { return }
        termButton.alpha = glassControlsVisible && activeTab == "timetable" ? 1 : 0
        termButton.isUserInteractionEnabled = glassControlsVisible && activeTab == "timetable"
    }
}

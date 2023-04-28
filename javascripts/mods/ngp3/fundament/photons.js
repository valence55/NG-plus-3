let PHOTON = {
	/* CORE */
	//Unlock
	req: _ => bigRipped() && player.money.gte(pow10(1.9e9)),
	unlocked: _ => ghSave?.photons.unl,
	unlock() {
		ghSave.photons.unl = true
		ngp3_feature_notify("ph")
		updatePhotonUnlocks()
	},

	//Calculation
	setup() {
		return {
			amt: E(0),
			emission: [],
			light: [],
			offset: [0,0,0,0,0,0,0],
			lighten: 0
		}
	},
	calc(dt) {
		ghSave.photons.amt = ghSave.photons.amt.add(this.photonGain().mul(dt))
		for (var i in this.emissionData) this.getEmission(i)

		this.release()
		this.enlighten()
	},
	temp() {
		if (!this.unlocked()) return

		let data = {}
		tmp.funda.photon = data

		data.leftover = 0
		for (var i of ghSave.photons.offset) data.leftover -= i

		data.cap = this.lightCap()
		data.eff = []
		for (var [i, light] of Object.entries(this.lightData)) data.eff[i] = light.eff(ghSave.photons.light[i] || 0)
	},

	/* FEATURES */
	//Feature - Photons
	photonGain() {
		let r = E(player.dilation.bestTPOverGhostifies.max(1).log10() / 200).pow(10)
		if (hasNanoReward("photon")) r = r.mul(getNanorewardEff("photon"))
		if (hasBLMilestone(18)) r = r.mul(blEff(18))
		return r
	},

	//Feature - Ions
	getEmission(i) {
		let amt = ghSave.photons.emission[i] || 0
		let kind = this.emissionData[i]
		let bulk = kind.bulk(kind.res())
		if (isNaN(bulk)) return

		ghSave.photons.emission[i] = Math.max(bulk, amt)
	},
	totalEmissions() {
		let total = 0
		for (const amt of ghSave.photons.emission) total += amt || 0
		return total
	},
	emissionData: [
		{
			resName: "Preonic Spin",
			res: _ => todSave.r.spin,

			req: i => E(10).pow(Math.pow(i,1.5)).mul(1e27),
			bulk: r => Math.floor(Math.pow(r.max(1).div(1e27).log(10),2/3)) + 1,
		}, {
			resName: "Spectral Particles",
			res: _ => ghSave.ghostParticles,

			req: i => E(1e3).pow(i).mul(1e19),
			bulk: r => Math.floor(r.max(1).div(1e19).log(1e3)) + 1,
		}, {
			resName: "Photons",
			res: _ => ghSave.photons.amt,

			req: i => E(3).pow(Math.pow(i, mod.p3ep ? 0.75 : 1)).mul(1e5),
			bulk: r => Math.floor(Math.pow(r.max(1).div(1e5).log(3), 1 / (mod.p3ep ? 0.75 : 1))) + 1,
		}
	],

	//Feature - Lights
	lightCap() {
		return 5+this.enlightenEff()
	},
	release() {
		ghSave.photons.light = []

		let total = this.totalEmissions()
		for (const [i, light] of Object.entries(this.lightData)) {
			let gain = total - light.start + 1
			gain *= 1 + ghSave.photons.offset[i]
			gain = Math.min(Math.max(gain, 0), tmp.funda.photon.cap)

			ghSave.photons.light.push(gain)
		}
	},
	lightData: [
		{
			name: "red",
			start: 1,
			eff: a => E_pow(tmp.gal.ts || 1, -Math.min(Math.sqrt(a) / 20, 0.2)),
			desc: e => `Multiply per-ten multiplier by ${shorten(e)}x. (based on tickspeed reduction)`
		}, {
			name: "orange",
			start: 3,
			eff: a => 1.5 - 0.5 / (a / 3 + 1),
			desc: e => `Starting at ^9, raise 2nd Neutrino Boost by ^${shorten(e)}.`
		}, {
			name: "yellow",
			start: 4,
			eff: a => Math.log2(a + 1) / 20,
			desc: e => `Discharged Galaxies work, but as ${(e*100).toFixed(1)}% effective.`
		}, {
			name: "green",
			start: 6,
			eff(a) {
				if (a > 5) a = Math.log10(a * 2) + 4
				return 1+a/1.5e3
			},
			desc: e => `Gain ${shorten((e-1)*100)}% more Neutrinos per Big Rip galaxy.`
		}, {
			name: "blue",
			start: 9,
			eff: a => Math.log10(a / 5 + 1) + 1,
			desc: e => `Raise Replicate Slowdown by ^${shorten(e)}.`
		}, {
			name: "violet",
			start: 11,
			eff: a => Math.log10(a + 1) / 5 + 1,
			desc: e => `Raise Emperor Dimensions by ^${shorten(e)}.`
		}, {
			name: "ultraviolet",
			start: 12,
			eff: a => Math.cbrt(a / 5 + 1),
			desc: e => `Post-16 Nanoreward scaling scales ${shorten(e)}x slower.`
		}
	],
	eff(x, def = 1) {
		return tmp.funda?.photon?.eff[x] ?? def
	},
	trade(x) {
		ghSave.photons.offset_click = x
		ghSave.photons.offset[x] += tmp.funda.photon.leftover ? .125 : -.125
		ghSave.photons.offset[x] = Math.max(ghSave.photons.offset[x], -.25)
		PHOTON.temp()
	},

	//Feature - Enlighten
	enlighten() {
		let lighten = ghSave.photons.lighten
		let gain = Math.floor(Math.floor((PHOTON.totalEmissions() - 14) / 2)) + 1
		ghSave.photons.lighten = Math.max(gain, lighten)
	},
	enlightenEff() {
		let r = ghSave.photons.lighten
		return Math.ceil(r * 2.5)
	},

	/* HTML */
	setupTab() {
		let shop = ``
		for (var i in PHOTON.emissionData) shop += `(Next: <span id='ph_shop_req_${i}'></span>)<br>`
		el("ph_shop").innerHTML = shop

		for (var [i, light] of Object.entries(PHOTON.lightData)) {
			el('ph_light_'+i).innerHTML = `<div id='ph_light_div_${i}' style='display: none'>
				<span id='ph_light_amt_${i}' style='font-size: 18px'></span>
				${light.name} (<span id='ph_light_per_${i}'></span>%)<br>
				<span id='ph_light_eff_${i}'></span><br>
				<button class='storebtn' id='ph_light_trade_${i}' onclick='PHOTON.trade(${i})'>Trade</button>
			</div><div id='ph_light_req_${i}'>
				Requires ${light.start} Emissions
			</div>`
		}
	},
	update() {
		if (!PHOTON.unlocked()) {
			el("gphUnl").textContent = "Get "+shortenCosts(pow10(1.9e9))+" antimatter in Big Rip to unlock Photons."
			return
		}

		el("ph_emission").textContent = getFullExpansion(PHOTON.totalEmissions())
		el("ph_amt").textContent = shortenMoney(ghSave.photons.amt)
		el("ph_prod").textContent = "(+" + shortenMoney(PHOTON.photonGain()) + "/s)"
		el("ph_lighten").textContent = getFullExpansion(ghSave.photons.lighten)
		el("ph_lighten_eff").textContent = "+" + getFullExpansion(PHOTON.enlightenEff()) + " cap"
		el("ph_lighten_req").textContent = "Requires " + getFullExpansion(ghSave.photons.lighten * 2 + 14) + " Emissions"

		for (const [i, emission] of Object.entries(PHOTON.emissionData)) {
			el("ph_shop_req_" + i).textContent = `${shorten(emission.req(ghSave.photons.emission[i] || 0))} ${emission.resName}`
		}
		for (const [i, light] of Object.entries(PHOTON.lightData)) {
			el("ph_light_per_" + i).textContent = ((1 + ghSave.photons.offset[i]) * 100).toFixed(0)
			el("ph_light_amt_" + i).textContent = shorten(ghSave.photons.light[i] || 0) + " / " + shorten(PHOTON.lightCap(i))
			el("ph_light_eff_" + i).textContent = light.desc(PHOTON.eff(i))
			el("ph_light_trade_" + i).textContent = tmp.funda.photon.leftover ? "Absorb" : "Exchange"
			el("ph_light_trade_" + i).className = tmp.funda.photon.leftover && ghSave.photons.offset_click == i ? "chosen" : tmp.funda.photon.leftover || ghSave.photons.offset[i] > -.25 ? "storebtn photon" : "unavailablebtn"

			el("ph_light_div_" + i).style.display = ghSave.photons.light[i] ? "" : "none"
			el("ph_light_req_" + i).style.display = ghSave.photons.light[i] ? "none" : ""
		}
	}
}

function updatePhotonUnlocks() {
	if (!ghostified) return

	let unl = PHOTON.unlocked()
	el("gphUnl").style.display = unl ? "none" : ""
	el("gphDiv").style.display = unl ? "" : "none"
}
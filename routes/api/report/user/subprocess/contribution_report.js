
var mongoConnection = require('../../../../../config/connectMongo')
mongoConnection()
var isodate = require("isodate");

const OrderForPos = require('../../../../../models/OrderForPos');
const PosOrderExchange = require('../../../../../models/PosOrderExchange');
const PosOrderRefund = require('../../../../../models/PosOrderRefund');
const Category = require('../../../../../models/Category');
const SubCategory = require('../../../../../models/SubCategory');

process.on('message', async (msg) => {
    let {
        from,
        to,
        field,
        branch,
        type
    } = msg

    from = new Date(from)
    to = new Date(to)

    let categories;

    if (field === 'category') {
        categories = await Category.find({
            branch: {
                $in: branch
            }
        }).select('_id name serialNo').sort({ serialNo: 1 })
    } else {
        categories = await SubCategory.find({
            branch: {
                $in: branch
            }
        }).select('_id name serialNo')
    }



    let orderListItems = await OrderForPos.find({
        branch: branch,
        create: {
            $gte: isodate(from),
            $lte: isodate(to)
        }
    })

    let exchangeListItems = await PosOrderExchange.find({
        branch: branch,
        create: {
            $gte: isodate(from),
            $lte: isodate(to)
        }
    })

    let refundListItems = await PosOrderRefund.find({
        branch: branch,
        create: {
            $gte: isodate(from),
            $lte: isodate(to)
        }
    })


    let reportData = []


    let grandTotal = {};
    let grandCustomerTotal = 0;
    let finalReportData = [];

    let categoryParentArray = categories.map(async (category, index) => {
        let categoryName = category.name.replace(/[^A-Z0-9]+/ig, "_");
        let customerIndex = 0
        grandTotal[categoryName] = 0


        let orderListParentArray = orderListItems.map(async (item, index) => {
            customerIndex = reportData.findIndex(phone => phone.number === item.customer.phone)
            if (customerIndex == -1) {
                reportData.push({
                    name: item.customer.name,
                    number: item.customer.phone,
                    [categoryName]: 0,
                    categories: [categoryName],
                    total: 0
                })
            } else {
                if (!(reportData[customerIndex].categories.includes(categoryName))) {
                    reportData[customerIndex].categories.push(categoryName)
                    reportData[customerIndex][categoryName] = 0
                }
            }

            let orderListChildOneArray = item.products.map(async product => {
                if (field == 'category') {
                    if (product.category.toString() === category._id.toString()) {
                        if (item.customer.phone != undefined && item.customer.name != undefined) {
                            customerIndex = reportData.findIndex(phone => phone.number === item.customer.phone)
                            if (customerIndex != -1) {
                                reportData[customerIndex][categoryName] += (product.price * product.quantity)
                                reportData[customerIndex].total += (product.price * product.quantity)
                                grandTotal[categoryName] += (product.price * product.quantity)
                                grandCustomerTotal += (product.price * product.quantity)
                            }
                        }

                    }
                } else {
                    if (product.subcategory.toString() == category._id.toString()) {
                        if (item.customer.phone != undefined && item.customer.name != undefined) {
                            customerIndex = reportData.findIndex(phone => phone.number === item.customer.phone)
                            if (customerIndex != -1) {
                                reportData[customerIndex][categoryName] += (product.price * product.quantity)
                                reportData[customerIndex].total += (product.price * product.quantity)
                                grandTotal[categoryName] += (product.price * product.quantity)
                                grandCustomerTotal += (product.price * product.quantity)
                            }
                        }
                    }
                }

            })
            await Promise.all(orderListChildOneArray)

        })

        await Promise.all(orderListParentArray)


        let exchangeListParentArray = exchangeListItems.map(async (item, index) => {
            let exchangeListChildOneArray = item.products.map(async product => {
                if (field == 'category') {
                    if (product.category.toString() == category._id.toString()) {
                        if (item.customer.phone != undefined && item.customer.name != undefined) {
                            customerIndex = reportData.findIndex(phone => phone.number === item.customer.phone)
                            if (customerIndex != -1) {
                                reportData[customerIndex][categoryName] += (product.price * product.quantity)
                                reportData[customerIndex].total += (product.price * product.quantity)
                                grandTotal[categoryName] += (product.price * product.quantity)
                                grandCustomerTotal += (product.price * product.quantity)
                            }
                        }
                    }
                } else {
                    if (product.subcategory.toString() == category._id.toString()) {
                        if (item.customer.phone != undefined && item.customer.name != undefined) {
                            customerIndex = reportData.findIndex(phone => phone.number === item.customer.phone)
                            if (customerIndex != -1) {
                                reportData[customerIndex][categoryName] += (product.price * product.quantity)
                                reportData[customerIndex].total += (product.price * product.quantity)
                                grandTotal[categoryName] += (product.price * product.quantity)
                                grandCustomerTotal += (product.price * product.quantity)
                            }
                        }
                    }
                }
            })
            await Promise.all(exchangeListChildOneArray)


            let exchangeListChildTwoArray = item.exchangedBy.map(async product => {
                if (field == 'category') {
                    if (product.category.toString() == category._id.toString()) {
                        if (item.customer.phone != undefined && item.customer.name != undefined) {
                            customerIndex = reportData.findIndex(phone => phone.number === item.customer.phone)
                            if (customerIndex != -1) {
                                reportData[customerIndex][categoryName] -= (product.price * product.quantity)
                                reportData[customerIndex].total -= (product.price * product.quantity)
                                grandTotal[categoryName] -= (product.price * product.quantity)
                                grandCustomerTotal -= (product.price * product.quantity)
                            }
                        }

                    }
                } else {
                    if (product.subcategory.toString() == category._id.toString()) {
                        if (item.customer.phone != undefined && item.customer.name != undefined) {
                            customerIndex = reportData.findIndex(phone => phone.number === item.customer.phone)
                            if (customerIndex != -1) {
                                reportData[customerIndex][categoryName] -= (product.price * product.quantity)
                                reportData[customerIndex].total -= (product.price * product.quantity)
                                grandTotal[categoryName] -= (product.price * product.quantity)
                                grandCustomerTotal -= (product.price * product.quantity)
                            }
                        }
                    }
                }
            })
            await Promise.all(exchangeListChildTwoArray)
        })

        await Promise.all(exchangeListParentArray)


        let refundListParentArray = refundListItems.map(async (item, index) => {

            let refundListChildOneArray = item.products.map(async product => {
                if (field == 'category') {
                    if (product.category.toString() == category._id.toString()) {
                        if (item.customer.phone != undefined && item.customer.name != undefined) {
                            customerIndex = reportData.findIndex(phone => phone.number === item.customer.phone)
                            if (customerIndex != -1) {
                                reportData[customerIndex][categoryName] -= (product.price * product.quantity)
                                reportData[customerIndex].total -= (product.price * product.quantity)
                                grandTotal[categoryName] -= (product.price * product.quantity)
                                grandCustomerTotal -= (product.price * product.quantity)
                            }
                        }

                    }
                } else {
                    if (product.subcategory.toString() == category._id.toString()) {
                        if (item.customer.phone != undefined && item.customer.name != undefined) {
                            customerIndex = reportData.findIndex(phone => phone.number === item.customer.phone)
                            if (customerIndex != -1) {
                                reportData[customerIndex][categoryName] -= (product.price * product.quantity)
                                reportData[customerIndex].total -= (product.price * product.quantity)
                                grandTotal[categoryName] -= (product.price * product.quantity)
                                grandCustomerTotal -= (product.price * product.quantity)
                            }
                        }
                    }
                }

            })
            await Promise.all(refundListChildOneArray)

        })
        await Promise.all(refundListParentArray)
        grandTotal[categoryName] = type == 'pdf' ? grandTotal[categoryName].toFixed(2) : grandTotal[categoryName]

    })
    await Promise.all(categoryParentArray)

    if (type == 'pdf') {
        // for category
        if (field == 'category') {
            let reportDataOne = []
            let reportDataTwo = []
            let reportDataThree = []
            reportDataArray = reportData.map((reportInfo) => {
                reportDataOne.push({
                    name: reportInfo.name,
                    number: reportInfo.number,
                    cosmetics: reportInfo.cosmetics ? reportInfo.cosmetics.toFixed(2) : '0.00',
                    food_snacks: reportInfo.food_snacks ? reportInfo.food_snacks.toFixed(2) : '0.00',
                    clock_glass: reportInfo.clock_glass ? reportInfo.clock_glass.toFixed(2) : '0.00',
                    commodities: reportInfo.commodities ? reportInfo.commodities.toFixed(2) : '0.00',
                    leather_bag: reportInfo.leather_bag ? reportInfo.leather_bag.toFixed(2) : '0.00',
                    baby_care: reportInfo.baby_care ? reportInfo.baby_care.toFixed(2) : '0.00',
                    toiletries: reportInfo.toiletries ? reportInfo.toiletries.toFixed(2) : '0.00',
                    shari_others: reportInfo.shari_others ? reportInfo.shari_others.toFixed(2) : '0.00',
                    garments: reportInfo.garments ? reportInfo.garments.toFixed(2) : '0.00'
                })

                reportDataTwo.push({
                    pet_care: reportInfo.pet_care ? reportInfo.pet_care.toFixed(2) : '0.00',
                    dairy: reportInfo.dairy ? reportInfo.dairy.toFixed(2) : '0.00',
                    stationary: reportInfo.stationary ? reportInfo.stationary.toFixed(2) : '0.00',
                    personal_care: reportInfo.personal_care ? reportInfo.personal_care.toFixed(2) : '0.00',
                    electronics_home_appli_: reportInfo.electronics_home_appli_ ? reportInfo.electronics_home_appli_.toFixed(2) : '0.00',
                    toys_sports: reportInfo.toys_sports ? reportInfo.toys_sports.toFixed(2) : '0.00',
                    footwear: reportInfo.footwear ? reportInfo.footwear.toFixed(2) : '0.00',
                    frozen_item: reportInfo.frozen_item ? reportInfo.frozen_item.toFixed(2) : '0.00',
                    food_snacks: reportInfo.food_snacks ? reportInfo.food_snacks.toFixed(2) : '0.00',
                    crockeries: reportInfo.crockeries ? reportInfo.crockeries.toFixed(2) : '0.00',
                    juice_beverage: reportInfo.juice_beverage ? reportInfo.juice_beverage.toFixed(2) : '0.00'
                })

                reportDataThree.push({
                    fish_meat: reportInfo.fish_meat ? reportInfo.fish_meat.toFixed(2) : '0.00',
                    baby_food: reportInfo.baby_food ? reportInfo.baby_food.toFixed(2) : '0.00',
                    house_hold: reportInfo.house_hold ? reportInfo.house_hold.toFixed(2) : '0.00',
                    medicine: reportInfo.medicine ? reportInfo.medicine.toFixed(2) : '0.00',
                    offer: reportInfo.offer ? reportInfo.offer.toFixed(2) : '0.00',
                    grocery: reportInfo.grocery ? reportInfo.grocery.toFixed(2) : '0.00',
                    showpiece: reportInfo.showpiece ? reportInfo.showpiece.toFixed(2) : '0.00',
                    jewlery: reportInfo.jewlery ? reportInfo.jewlery.toFixed(2) : '0.00',
                    fruits_vegetables: reportInfo.fruits_vegetables ? reportInfo.fruits_vegetables.toFixed(2) : '0.00',
                    total: reportInfo.total.toFixed(2)
                })
            })



            finalReportData.push({
                reportDataOne: reportDataOne
            })
            finalReportData.push({
                reportDataTwo: reportDataTwo
            })
            finalReportData.push({
                reportDataThree: reportDataThree
            })

        } else {
            let reportDataOne = []
            let reportDataTwo = []
            let reportDataThree = []
            let reportDataFour = []
            let reportDataFive = []
            let reportDataSix = []
            let reportDataSeven = []
            let reportDataEight = []
            let reportDataNine = []
            let reportDataTen = []
            let reportDataEleven = []
            let reportDataTwelve = []
            let reportDataThirteen = []
            let reportDataFourteen = []
            let reportDataFifthteen = []


            reportDataArray = reportData.map((reportInfo) => {
                reportDataOne.push({
                    name: reportInfo.name,
                    number: reportInfo.number,
                    jam_jelly_pickle: reportInfo.jam_jelly_pickle ? reportInfo.jam_jelly_pickle.toFixed(2) : '0.00',
                    pest_control_mosquito_repellent: reportInfo.pest_control_mosquito_repellent ? reportInfo.pest_control_mosquito_repellent.toFixed(2) : '0.00',
                    fruits: reportInfo.fruits ? reportInfo.fruits.toFixed(2) : '0.00',
                    toiletries: reportInfo.toiletries ? reportInfo.toiletries.toFixed(2) : '0.00',
                    baby_oral_care: reportInfo.baby_oral_care ? reportInfo.baby_oral_care.toFixed(2) : '0.00',
                    electronics: reportInfo.electronics ? reportInfo.electronics.toFixed(2) : '0.00',
                    air_freshener: reportInfo.air_freshener ? reportInfo.air_freshener.toFixed(2) : '0.00',
                    eyepencil_eye: reportInfo.eyepencil_eye ? reportInfo.eyepencil_eye.toFixed(2) : '0.00'
                })

                reportDataTwo.push({
                    supplement: reportInfo.supplement ? reportInfo.supplement.toFixed(2) : '0.00',
                    antiseptic_items: reportInfo.antiseptic_items ? reportInfo.antiseptic_items.toFixed(2) : '0.00',
                    cosmetics: reportInfo.cosmetics ? reportInfo.cosmetics.toFixed(2) : '0.00',
                    atta_maida_suji: reportInfo.atta_maida_suji ? reportInfo.atta_maida_suji.toFixed(2) : '0.00',
                    detergents_liquid_cleanser: reportInfo.detergents_liquid_cleanser ? reportInfo.detergents_liquid_cleanser.toFixed(2) : '0.00',
                    bread_biscuit_cake_others: reportInfo.bread_biscuit_cake_others ? reportInfo.bread_biscuit_cake_others.toFixed(2) : '0.00',
                    corn_flakes: reportInfo.corn_flakes ? reportInfo.corn_flakes.toFixed(2) : '0.00',
                    water: reportInfo.water ? reportInfo.water.toFixed(2) : '0.00',
                    belt_wallet: reportInfo.belt_wallet ? reportInfo.belt_wallet.toFixed(2) : '0.00',
                    juice: reportInfo.juice ? reportInfo.juice.toFixed(2) : '0.00'
                })

                reportDataThree.push({
                    hair_clipper: reportInfo.hair_clipper ? reportInfo.hair_clipper.toFixed(2) : '0.00',
                    ice_cream: reportInfo.ice_cream ? reportInfo.ice_cream.toFixed(2) : '0.00',
                    cereal: reportInfo.cereal ? reportInfo.cereal.toFixed(2) : '0.00',
                    cheese: reportInfo.cheese ? reportInfo.cheese.toFixed(2) : '0.00',
                    crockeries_item: reportInfo.crockeries_item ? reportInfo.crockeries_item.toFixed(2) : '0.00',
                    coffee_tea: reportInfo.coffee_tea ? reportInfo.coffee_tea.toFixed(2) : '0.00',
                    cotton_bads: reportInfo.cotton_bads ? reportInfo.cotton_bads.toFixed(2) : '0.00',
                    bed_sheet: reportInfo.bed_sheet ? reportInfo.bed_sheet.toFixed(2) : '0.00',
                    can_food: reportInfo.can_food ? reportInfo.can_food.toFixed(2) : '0.00',
                    pest_control: reportInfo.pest_control ? reportInfo.pest_control.toFixed(2) : '0.00'
                })

                reportDataFour.push({
                    butter_ghee: reportInfo.butter_ghee ? reportInfo.butter_ghee.toFixed(2) : '0.00',
                    shaving_item: reportInfo.shaving_item ? reportInfo.shaving_item.toFixed(2) : '0.00',
                    colour_cosmetics: reportInfo.colour_cosmetics ? reportInfo.colour_cosmetics.toFixed(2) : '0.00',
                    kids: reportInfo.kids ? reportInfo.kids.toFixed(2) : '0.00',
                    diaper_wipes: reportInfo.diaper_wipes ? reportInfo.diaper_wipes.toFixed(2) : '0.00',
                    essasenc_colour_syrup: reportInfo.essasenc_colour_syrup ? reportInfo.essasenc_colour_syrup.toFixed(2) : '0.00',
                    baby_hair_care: reportInfo.baby_hair_care ? reportInfo.baby_hair_care.toFixed(2) : '0.00',
                    chocolate_chips_other: reportInfo.chocolate_chips_other ? reportInfo.chocolate_chips_other.toFixed(2) : '0.00',
                    baby_skin_care: reportInfo.baby_skin_care ? reportInfo.baby_skin_care.toFixed(2) : '0.00',
                    energy_drink: reportInfo.energy_drink ? reportInfo.energy_drink.toFixed(2) : '0.00'
                })

                reportDataFive.push({
                    dish_wash: reportInfo.dish_wash ? reportInfo.dish_wash.toFixed(2) : '0.00',
                    home_accessories: reportInfo.home_accessories ? reportInfo.home_accessories.toFixed(2) : '0.00',
                    baby_accessories: reportInfo.baby_accessories ? reportInfo.baby_accessories.toFixed(2) : '0.00',
                    vinegar_mayonnaise_salad_dressing_spreads: reportInfo.vinegar_mayonnaise_salad_dressing_spreads ? reportInfo.vinegar_mayonnaise_salad_dressing_spreads.toFixed(2) : '0.00',
                    socks_other: reportInfo.socks_other ? reportInfo.socks_other.toFixed(2) : '0.00',
                    liquid_milk: reportInfo.liquid_milk ? reportInfo.liquid_milk.toFixed(2) : '0.00',
                    fabric_colour: reportInfo.fabric_colour ? reportInfo.fabric_colour.toFixed(2) : '0.00',
                    showpiece: reportInfo.showpiece ? reportInfo.showpiece.toFixed(2) : '0.00',
                    school_bag: reportInfo.school_bag ? reportInfo.school_bag.toFixed(2) : '0.00',
                    deodorants_body_sprays_roll_on: reportInfo.deodorants_body_sprays_roll_on ? reportInfo.deodorants_body_sprays_roll_on.toFixed(2) : '0.00'
                })
                reportDataSix.push({
                    milk_powder: reportInfo.milk_powder ? reportInfo.milk_powder.toFixed(2) : '0.00',
                    oral_care_other: reportInfo.oral_care_other ? reportInfo.oral_care_other.toFixed(2) : '0.00',
                    salt_sugar: reportInfo.salt_sugar ? reportInfo.salt_sugar.toFixed(2) : '0.00',
                    under_garments: reportInfo.under_garments ? reportInfo.under_garments.toFixed(2) : '0.00',
                    gents: reportInfo.gents ? reportInfo.gents.toFixed(2) : '0.00',
                    honey_sweets: reportInfo.honey_sweets ? reportInfo.honey_sweets.toFixed(2) : '0.00',
                    rings_earrings: reportInfo.rings_earrings ? reportInfo.rings_earrings.toFixed(2) : '0.00',
                    tissues: reportInfo.tissues ? reportInfo.tissues.toFixed(2) : '0.00',
                    fabric_brightener: reportInfo.fabric_brightener ? reportInfo.fabric_brightener.toFixed(2) : '0.00',
                    skin_care: reportInfo.skin_care ? reportInfo.skin_care.toFixed(2) : '0.00',
                })
                reportDataSeven.push({
                    frozen_item: reportInfo.frozen_item ? reportInfo.frozen_item.toFixed(2) : '0.00',
                    kasundi: reportInfo.kasundi ? reportInfo.kasundi.toFixed(2) : '0.00',
                    mayonise: reportInfo.mayonise ? reportInfo.mayonise.toFixed(2) : '0.00',
                    meat: reportInfo.meat ? reportInfo.meat.toFixed(2) : '0.00',
                    nail_polish_nail_cutter: reportInfo.nail_polish_nail_cutter ? reportInfo.nail_polish_nail_cutter.toFixed(2) : '0.00',
                    ladies: reportInfo.ladies ? reportInfo.ladies.toFixed(2) : '0.00',
                    wall_clock: reportInfo.wall_clock ? reportInfo.wall_clock.toFixed(2) : '0.00',
                    toys: reportInfo.toys ? reportInfo.toys.toFixed(2) : '0.00',
                    cat_food: reportInfo.cat_food ? reportInfo.cat_food.toFixed(2) : '0.00',
                    rice_chal: reportInfo.rice_chal ? reportInfo.rice_chal.toFixed(2) : '0.00'
                })
                reportDataEight.push({
                    ladies_bag: reportInfo.ladies_bag ? reportInfo.ladies_bag.toFixed(2) : '0.00',
                    ladies_garments: reportInfo.ladies_garments ? reportInfo.ladies_garments.toFixed(2) : '0.00',
                    sports: reportInfo.sports ? reportInfo.sports.toFixed(2) : '0.00',
                    soap: reportInfo.soap ? reportInfo.soap.toFixed(2) : '0.00',
                    gents_garments: reportInfo.gents_garments ? reportInfo.gents_garments.toFixed(2) : '0.00',
                    fresh_water_fish: reportInfo.fresh_water_fish ? reportInfo.fresh_water_fish.toFixed(2) : '0.00',
                    sea_fish: reportInfo.sea_fish ? reportInfo.sea_fish.toFixed(2) : '0.00',
                    yogurt: reportInfo.yogurt ? reportInfo.yogurt.toFixed(2) : '0.00',
                    powder_milk: reportInfo.powder_milk ? reportInfo.powder_milk.toFixed(2) : '0.00',
                    chicken: reportInfo.chicken ? reportInfo.chicken.toFixed(2) : '0.00'
                })
                reportDataNine.push({
                    janamaz: reportInfo.janamaz ? reportInfo.janamaz.toFixed(2) : '0.00',
                    mosquito_net: reportInfo.mosquito_net ? reportInfo.mosquito_net.toFixed(2) : '0.00',
                    offer: reportInfo.offer ? reportInfo.offer.toFixed(2) : '0.00',
                    saree: reportInfo.saree ? reportInfo.saree.toFixed(2) : '0.00',
                    soft_drinks: reportInfo.soft_drinks ? reportInfo.soft_drinks.toFixed(2) : '0.00',
                    egg: reportInfo.egg ? reportInfo.egg.toFixed(2) : '0.00',
                    first_aid: reportInfo.first_aid ? reportInfo.first_aid.toFixed(2) : '0.00',
                    family_planning: reportInfo.family_planning ? reportInfo.family_planning.toFixed(2) : '0.00',
                    shoe_care: reportInfo.shoe_care ? reportInfo.shoe_care.toFixed(2) : '0.00',
                    dal: reportInfo.dal ? reportInfo.dal.toFixed(2) : '0.00',

                })
                reportDataTen.push({
                    vegetable: reportInfo.vegetable ? reportInfo.vegetable.toFixed(2) : '0.00',
                    perfume_attar: reportInfo.perfume_attar ? reportInfo.perfume_attar.toFixed(2) : '0.00',
                    clock: reportInfo.clock ? reportInfo.clock.toFixed(2) : '0.00',
                    sunglass_chosma: reportInfo.sunglass_chosma ? reportInfo.sunglass_chosma.toFixed(2) : '0.00',
                    powdered_drinks: reportInfo.powdered_drinks ? reportInfo.powdered_drinks.toFixed(2) : '0.00',
                    syrup: reportInfo.syrup ? reportInfo.syrup.toFixed(2) : '0.00',
                    popcorn_nuts_other: reportInfo.popcorn_nuts_other ? reportInfo.popcorn_nuts_other.toFixed(2) : '0.00',
                    kids_garments: reportInfo.kids_garments ? reportInfo.kids_garments.toFixed(2) : '0.00',
                    liquid_cleaner: reportInfo.liquid_cleaner ? reportInfo.liquid_cleaner.toFixed(2) : '0.00',
                    lipstick_lip: reportInfo.lipstick_lip ? reportInfo.lipstick_lip.toFixed(2) : '0.00',
                })
                reportDataEleven.push({
                    hair_care: reportInfo.hair_care ? reportInfo.hair_care.toFixed(2) : '0.00',
                    hand_wash_hand_sanitizer: reportInfo.hand_wash_hand_sanitizer ? reportInfo.hand_wash_hand_sanitizer.toFixed(2) : '0.00',
                    dry_vegetables: reportInfo.dry_vegetables ? reportInfo.dry_vegetables.toFixed(2) : '0.00',
                    travel_bag: reportInfo.travel_bag ? reportInfo.travel_bag.toFixed(2) : '0.00',
                    oil: reportInfo.oil ? reportInfo.oil.toFixed(2) : '0.00',
                    kitchen_accessories: reportInfo.kitchen_accessories ? reportInfo.kitchen_accessories.toFixed(2) : '0.00',
                    lassi_milk_shak_borhani: reportInfo.lassi_milk_shak_borhani ? reportInfo.lassi_milk_shak_borhani.toFixed(2) : '0.00',
                    blanket: reportInfo.blanket ? reportInfo.blanket.toFixed(2) : '0.00',
                    beauty: reportInfo.beauty ? reportInfo.beauty.toFixed(2) : '0.00',
                    home_appliance: reportInfo.home_appliance ? reportInfo.home_appliance.toFixed(2) : '0.00'
                })
                reportDataTwelve.push({
                    bracelets_payel: reportInfo.bracelets_payel ? reportInfo.bracelets_payel.toFixed(2) : '0.00',
                    nose_pin: reportInfo.nose_pin ? reportInfo.nose_pin.toFixed(2) : '0.00',
                    hair_stick_band: reportInfo.hair_stick_band ? reportInfo.hair_stick_band.toFixed(2) : '0.00',
                    sauce_ketchup_kashundi: reportInfo.sauce_ketchup_kashundi ? reportInfo.sauce_ketchup_kashundi.toFixed(2) : '0.00',
                    napkins_contraceptives_others: reportInfo.napkins_contraceptives_others ? reportInfo.napkins_contraceptives_others.toFixed(2) : '0.00',
                    ladies_parts: reportInfo.ladies_parts ? reportInfo.ladies_parts.toFixed(2) : '0.00',
                    spagadi_noodles_shemai_soup: reportInfo.spagadi_noodles_shemai_soup ? reportInfo.spagadi_noodles_shemai_soup.toFixed(2) : '0.00',
                    stationary: reportInfo.stationary ? reportInfo.stationary.toFixed(2) : '0.00',
                    bath_laundry_soap: reportInfo.bath_laundry_soap ? reportInfo.bath_laundry_soap.toFixed(2) : '0.00',
                    dog_food: reportInfo.dog_food ? reportInfo.dog_food.toFixed(2) : '0.00',
                })
                reportDataThirteen.push({
                    gift_item: reportInfo.gift_item ? reportInfo.gift_item.toFixed(2) : '0.00',
                    office_stationary: reportInfo.office_stationary ? reportInfo.office_stationary.toFixed(2) : '0.00',
                    nail_care: reportInfo.nail_care ? reportInfo.nail_care.toFixed(2) : '0.00',
                    birds_other: reportInfo.birds_other ? reportInfo.birds_other.toFixed(2) : '0.00',
                    bed_sheet_others: reportInfo.bed_sheet_others ? reportInfo.bed_sheet_others.toFixed(2) : '0.00',
                    dry_fish: reportInfo.dry_fish ? reportInfo.dry_fish.toFixed(2) : '0.00',
                    soup_spoon: reportInfo.soup_spoon ? reportInfo.soup_spoon.toFixed(2) : '0.00',
                    face_wash: reportInfo.face_wash ? reportInfo.face_wash.toFixed(2) : '0.00',
                    hand_watch: reportInfo.hand_watch ? reportInfo.hand_watch.toFixed(2) : '0.00',
                    shoes: reportInfo.shoes ? reportInfo.shoes.toFixed(2) : '0.00',

                })
                reportDataFourteen.push({
                    mobile_accessories: reportInfo.mobile_accessories ? reportInfo.mobile_accessories.toFixed(2) : '0.00',
                    baby_food: reportInfo.baby_food ? reportInfo.baby_food.toFixed(2) : '0.00',
                    perfume_bodysppary_roleone: reportInfo.perfume_bodysppary_roleone ? reportInfo.perfume_bodysppary_roleone.toFixed(2) : '0.00',
                    energy_drinks: reportInfo.energy_drinks ? reportInfo.energy_drinks.toFixed(2) : '0.00',
                    lassi_milk_milk_shake: reportInfo.lassi_milk_milk_shake ? reportInfo.lassi_milk_milk_shake.toFixed(2) : '0.00',
                    shaving_items: reportInfo.shaving_items ? reportInfo.shaving_items.toFixed(2) : '0.00',
                    oral_care: reportInfo.oral_care ? reportInfo.oral_care.toFixed(2) : '0.00',
                    roys: reportInfo.roys ? reportInfo.roys.toFixed(2) : '0.00',
                    party_popper: reportInfo.party_popper ? reportInfo.party_popper.toFixed(2) : '0.00',
                    frozen_items: reportInfo.frozen_items ? reportInfo.frozen_items.toFixed(2) : '0.00',
                })

                reportDataFifthteen.push({
                    spice_mix: reportInfo.spice_mix ? reportInfo.spice_mix.toFixed(2) : '0.00',
                    dry_fruits: reportInfo.dry_fruits ? reportInfo.dry_fruits.toFixed(2) : '0.00',
                    necklace: reportInfo.necklace ? reportInfo.necklace.toFixed(2) : '0.00',
                    socks: reportInfo.socks ? reportInfo.socks.toFixed(2) : '0.00',
                    perfume_bodyspray: reportInfo.perfume_bodyspray ? reportInfo.perfume_bodyspray.toFixed(2) : '0.00',
                    chocolate_wafer_marsh_low_chips: reportInfo.chocolate_wafer_marsh_low_chips ? reportInfo.chocolate_wafer_marsh_low_chips.toFixed(2) : '0.00',
                    total: reportInfo.total.toFixed(2)
                })
            })

            finalReportData.push({
                reportDataOne: reportDataOne
            })
            finalReportData.push({
                reportDataTwo: reportDataTwo
            })
            finalReportData.push({
                reportDataThree: reportDataThree
            })
            finalReportData.push({
                reportDataFour: reportDataFour
            })
            finalReportData.push({
                reportDataFive: reportDataFive
            })
            finalReportData.push({
                reportDataSix: reportDataSix
            })
            finalReportData.push({
                reportDataSeven: reportDataSeven
            })
            finalReportData.push({
                reportDataEight: reportDataEight
            })
            finalReportData.push({
                reportDataNine: reportDataNine
            })
            finalReportData.push({
                reportDataTen: reportDataTen
            })
            finalReportData.push({
                reportDataEleven: reportDataEleven
            })
            finalReportData.push({
                reportDataTwelve: reportDataTwelve
            })
            finalReportData.push({
                reportDataThirteen: reportDataThirteen
            })
            finalReportData.push({
                reportDataFourteen: reportDataFourteen
            })
            finalReportData.push({
                reportDataFifthteen: reportDataFifthteen
            })
        }

        process.send({
            finalReportData,
            grandTotal,
            grandCustomerTotal
        });
    } else {
        if (field == 'category') {
            let reportDataOne = []
            let reportDataTwo = []
            let reportDataThree = []
            reportDataArray = reportData.map((reportInfo) => {
                reportDataOne.push({
                    name: reportInfo.name,
                    number: reportInfo.number,
                    cosmetics: reportInfo.cosmetics ? reportInfo.cosmetics : 0,
                    food_snacks: reportInfo.food_snacks ? reportInfo.food_snacks : 0,
                    clock_glass: reportInfo.clock_glass ? reportInfo.clock_glass : 0,
                    commodities: reportInfo.commodities ? reportInfo.commodities : 0,
                    leather_bag: reportInfo.leather_bag ? reportInfo.leather_bag : 0,
                    baby_care: reportInfo.baby_care ? reportInfo.baby_care : 0,
                    toiletries: reportInfo.toiletries ? reportInfo.toiletries : 0,
                    shari_others: reportInfo.shari_others ? reportInfo.shari_others : 0,
                    garments: reportInfo.garments ? reportInfo.garments : 0,
                    pet_care: reportInfo.pet_care ? reportInfo.pet_care : 0
                })

                reportDataTwo.push({
                    dairy: reportInfo.dairy ? reportInfo.dairy : 0,
                    stationary: reportInfo.stationary ? reportInfo.stationary : 0,
                    personal_care: reportInfo.personal_care ? reportInfo.personal_care : 0,
                    electronics_home_appli_: reportInfo.electronics_home_appli_ ? reportInfo.electronics_home_appli_ : 0,
                    toys_sports: reportInfo.toys_sports ? reportInfo.toys_sports : 0,
                    footwear: reportInfo.footwear ? reportInfo.footwear : 0,
                    frozen_item: reportInfo.frozen_item ? reportInfo.frozen_item : 0,
                    food_snacks: reportInfo.food_snacks ? reportInfo.food_snacks : 0,
                    crockeries: reportInfo.crockeries ? reportInfo.crockeries : 0,
                    juice_beverage: reportInfo.juice_beverage ? reportInfo.juice_beverage : 0,
                    fish_meat: reportInfo.fish_meat ? reportInfo.fish_meat : 0
                })

                reportDataThree.push({
                    baby_food: reportInfo.baby_food ? reportInfo.baby_food : 0,
                    house_hold: reportInfo.house_hold ? reportInfo.house_hold : 0,
                    medicine: reportInfo.medicine ? reportInfo.medicine : 0,
                    offer: reportInfo.offer ? reportInfo.offer : 0,
                    grocery: reportInfo.grocery ? reportInfo.grocery : 0,
                    showpiece: reportInfo.showpiece ? reportInfo.showpiece : 0,
                    jewlery: reportInfo.jewlery ? reportInfo.jewlery : 0,
                    fruits_vegetables: reportInfo.fruits_vegetables ? reportInfo.fruits_vegetables : 0,
                    total: reportInfo.total
                })
            })



            finalReportData.push({
                reportDataOne: reportDataOne
            })
            finalReportData.push({
                reportDataTwo: reportDataTwo
            })
            finalReportData.push({
                reportDataThree: reportDataThree
            })

        } else {
            let reportDataOne = []
            let reportDataTwo = []
            let reportDataThree = []
            let reportDataFour = []
            let reportDataFive = []
            let reportDataSix = []
            let reportDataSeven = []
            let reportDataEight = []
            let reportDataNine = []
            let reportDataTen = []
            let reportDataEleven = []
            let reportDataTwelve = []
            let reportDataThirteen = []

            reportDataArray = reportData.map((reportInfo) => {
                reportDataOne.push({
                    name: reportInfo.name,
                    number: reportInfo.number,
                    jam_jelly_pickle: reportInfo.jam_jelly_pickle ? reportInfo.jam_jelly_pickle : 0,
                    pest_control_mosquito_repellent: reportInfo.pest_control_mosquito_repellent ? reportInfo.pest_control_mosquito_repellent : 0,
                    fruits: reportInfo.fruits ? reportInfo.fruits : 0,
                    toiletries: reportInfo.toiletries ? reportInfo.toiletries : 0,
                    baby_oral_care: reportInfo.baby_oral_care ? reportInfo.baby_oral_care : 0,
                    electronics: reportInfo.electronics ? reportInfo.electronics : 0,
                    air_freshener: reportInfo.air_freshener ? reportInfo.air_freshener : 0,
                    eyepencil_eye: reportInfo.eyepencil_eye ? reportInfo.eyepencil_eye : 0,
                    supplement: reportInfo.supplement ? reportInfo.supplement : 0,
                    antiseptic_items: reportInfo.antiseptic_items ? reportInfo.antiseptic_items : 0
                })

                reportDataTwo.push({
                    cosmetics: reportInfo.cosmetics ? reportInfo.cosmetics : 0,
                    atta_maida_suji: reportInfo.atta_maida_suji ? reportInfo.atta_maida_suji : 0,
                    detergents_liquid_cleanser: reportInfo.detergents_liquid_cleanser ? reportInfo.detergents_liquid_cleanser : 0,
                    bread_biscuit_cake_others: reportInfo.bread_biscuit_cake_others ? reportInfo.bread_biscuit_cake_others : 0,
                    corn_flakes: reportInfo.corn_flakes ? reportInfo.corn_flakes : 0,
                    water: reportInfo.water ? reportInfo.water : 0,
                    belt_wallet: reportInfo.belt_wallet ? reportInfo.belt_wallet : 0,
                    juice: reportInfo.juice ? reportInfo.juice : 0,
                    hair_clipper: reportInfo.hair_clipper ? reportInfo.hair_clipper : 0,
                    ice_cream: reportInfo.ice_cream ? reportInfo.ice_cream : 0,
                    cereal: reportInfo.cereal ? reportInfo.cereal : 0,
                    cheese: reportInfo.cheese ? reportInfo.cheese : 0
                })

                reportDataThree.push({
                    crockeries_item: reportInfo.crockeries_item ? reportInfo.crockeries_item : 0,
                    coffee_tea: reportInfo.coffee_tea ? reportInfo.coffee_tea : 0,
                    cotton_bads: reportInfo.cotton_bads ? reportInfo.cotton_bads : 0,
                    bed_sheet: reportInfo.bed_sheet ? reportInfo.bed_sheet : 0,
                    can_food: reportInfo.can_food ? reportInfo.can_food : 0,
                    pest_control: reportInfo.pest_control ? reportInfo.pest_control : 0,
                    butter_ghee: reportInfo.butter_ghee ? reportInfo.butter_ghee : 0,
                    shaving_item: reportInfo.shaving_item ? reportInfo.shaving_item : 0,
                    colour_cosmetics: reportInfo.colour_cosmetics ? reportInfo.colour_cosmetics : 0,
                    kids: reportInfo.kids ? reportInfo.kids : 0,
                    diaper_wipes: reportInfo.diaper_wipes ? reportInfo.diaper_wipes : 0,
                    essasenc_colour_syrup: reportInfo.essasenc_colour_syrup ? reportInfo.essasenc_colour_syrup : 0
                })

                reportDataFour.push({
                    baby_hair_care: reportInfo.baby_hair_care ? reportInfo.baby_hair_care : 0,
                    chocolate_chips_other: reportInfo.chocolate_chips_other ? reportInfo.chocolate_chips_other : 0,
                    baby_skin_care: reportInfo.baby_skin_care ? reportInfo.baby_skin_care : 0,
                    energy_drink: reportInfo.energy_drink ? reportInfo.energy_drink : 0,
                    dish_wash: reportInfo.dish_wash ? reportInfo.dish_wash : 0,
                    home_accessories: reportInfo.home_accessories ? reportInfo.home_accessories : 0,
                    baby_accessories: reportInfo.baby_accessories ? reportInfo.baby_accessories : 0,
                    vinegar_mayonnaise_salad_dressing_spreads: reportInfo.vinegar_mayonnaise_salad_dressing_spreads ? reportInfo.vinegar_mayonnaise_salad_dressing_spreads : 0,
                    socks_other: reportInfo.socks_other ? reportInfo.socks_other : 0,
                    liquid_milk: reportInfo.liquid_milk ? reportInfo.liquid_milk : 0,
                    fabric_colour: reportInfo.fabric_colour ? reportInfo.fabric_colour : 0
                })

                reportDataFive.push({
                    showpiece: reportInfo.showpiece ? reportInfo.showpiece : 0,
                    school_bag: reportInfo.school_bag ? reportInfo.school_bag : 0,
                    deodorants_body_sprays_roll_on: reportInfo.deodorants_body_sprays_roll_on ? reportInfo.deodorants_body_sprays_roll_on : 0,
                    milk_powder: reportInfo.milk_powder ? reportInfo.milk_powder : 0,
                    oral_care_other: reportInfo.oral_care_other ? reportInfo.oral_care_other : 0,
                    salt_sugar: reportInfo.salt_sugar ? reportInfo.salt_sugar : 0,
                    under_garments: reportInfo.under_garments ? reportInfo.under_garments : 0,
                    gents: reportInfo.gents ? reportInfo.gents : 0,
                    honey_sweets: reportInfo.honey_sweets ? reportInfo.honey_sweets : 0,
                    rings_earrings: reportInfo.rings_earrings ? reportInfo.rings_earrings : 0,
                    tissues: reportInfo.tissues ? reportInfo.tissues : 0,
                    fabric_brightener: reportInfo.fabric_brightener ? reportInfo.fabric_brightener : 0
                })
                reportDataSix.push({
                    skin_care: reportInfo.skin_care ? reportInfo.skin_care : 0,
                    spice_mix: reportInfo.spice_mix ? reportInfo.spice_mix : 0,
                    frozen_item: reportInfo.frozen_item ? reportInfo.frozen_item : 0,
                    kasundi: reportInfo.kasundi ? reportInfo.kasundi : 0,
                    mayonise: reportInfo.mayonise ? reportInfo.mayonise : 0,
                    meat: reportInfo.meat ? reportInfo.meat : 0,
                    nail_polish_nail_cutter: reportInfo.nail_polish_nail_cutter ? reportInfo.nail_polish_nail_cutter : 0,
                    ladies: reportInfo.ladies ? reportInfo.ladies : 0,
                    wall_clock: reportInfo.wall_clock ? reportInfo.wall_clock : 0,
                    toys: reportInfo.toys ? reportInfo.toys : 0,
                    cat_food: reportInfo.cat_food ? reportInfo.cat_food : 0,
                    rice_chal: reportInfo.rice_chal ? reportInfo.rice_chal : 0
                })
                reportDataSeven.push({
                    ladies_bag: reportInfo.ladies_bag ? reportInfo.ladies_bag : 0,
                    ladies_garments: reportInfo.ladies_garments ? reportInfo.ladies_garments : 0,
                    sports: reportInfo.sports ? reportInfo.sports : 0,
                    soap: reportInfo.soap ? reportInfo.soap : 0,
                    gents_garments: reportInfo.gents_garments ? reportInfo.gents_garments : 0,
                    fresh_water_fish: reportInfo.fresh_water_fish ? reportInfo.fresh_water_fish : 0,
                    sea_fish: reportInfo.sea_fish ? reportInfo.sea_fish : 0,
                    yogurt: reportInfo.yogurt ? reportInfo.yogurt : 0,
                    powder_milk: reportInfo.powder_milk ? reportInfo.powder_milk : 0,
                    chicken: reportInfo.chicken ? reportInfo.chicken : 0,
                    janamaz: reportInfo.janamaz ? reportInfo.janamaz : 0,
                    mosquito_net: reportInfo.mosquito_net ? reportInfo.mosquito_net : 0,
                })
                reportDataEight.push({
                    offer: reportInfo.offer ? reportInfo.offer : 0,
                    saree: reportInfo.saree ? reportInfo.saree : 0,
                    soft_drinks: reportInfo.soft_drinks ? reportInfo.soft_drinks : 0,
                    egg: reportInfo.egg ? reportInfo.egg : 0,
                    first_aid: reportInfo.first_aid ? reportInfo.first_aid : 0,
                    family_planning: reportInfo.family_planning ? reportInfo.family_planning : 0,
                    shoe_care: reportInfo.shoe_care ? reportInfo.shoe_care : 0,
                    dal: reportInfo.dal ? reportInfo.dal : 0,
                    dry_vegetables: reportInfo.dry_vegetables ? reportInfo.dry_vegetables : 0,
                    travel_bag: reportInfo.travel_bag ? reportInfo.travel_bag : 0,
                    oil: reportInfo.oil ? reportInfo.oil : 0,
                    kitchen_accessories: reportInfo.kitchen_accessories ? reportInfo.kitchen_accessories : 0
                })
                reportDataNine.push({
                    lassi_milk_shak_borhani: reportInfo.lassi_milk_shak_borhani ? reportInfo.lassi_milk_shak_borhani : 0,
                    blanket: reportInfo.blanket ? reportInfo.blanket : 0,
                    beauty: reportInfo.beauty ? reportInfo.beauty : 0,
                    home_appliance: reportInfo.home_appliance ? reportInfo.home_appliance : 0,
                    dry_fruits: reportInfo.dry_fruits ? reportInfo.dry_fruits : 0,
                    necklace: reportInfo.necklace ? reportInfo.necklace : 0,
                    bracelets_payel: reportInfo.bracelets_payel ? reportInfo.bracelets_payel : 0,
                    nose_pin: reportInfo.nose_pin ? reportInfo.nose_pin : 0,
                    hair_stick_band: reportInfo.hair_stick_band ? reportInfo.hair_stick_band : 0,
                    sauce_ketchup_kashundi: reportInfo.sauce_ketchup_kashundi ? reportInfo.sauce_ketchup_kashundi : 0,
                    napkins_contraceptives_others: reportInfo.napkins_contraceptives_others ? reportInfo.napkins_contraceptives_others : 0,
                    ladies_parts: reportInfo.ladies_parts ? reportInfo.ladies_parts : 0
                })
                reportDataTen.push({
                    vegetable: reportInfo.vegetable ? reportInfo.vegetable : 0,
                    perfume_attar: reportInfo.perfume_attar ? reportInfo.perfume_attar : 0,
                    clock: reportInfo.clock ? reportInfo.clock : 0,
                    sunglass_chosma: reportInfo.sunglass_chosma ? reportInfo.sunglass_chosma : 0,
                    powdered_drinks: reportInfo.powdered_drinks ? reportInfo.powdered_drinks : 0,
                    syrup: reportInfo.syrup ? reportInfo.syrup : 0,
                    popcorn_nuts_other: reportInfo.popcorn_nuts_other ? reportInfo.popcorn_nuts_other : 0,
                    kids_garments: reportInfo.kids_garments ? reportInfo.kids_garments : 0,
                    liquid_cleaner: reportInfo.liquid_cleaner ? reportInfo.liquid_cleaner : 0,
                    lipstick_lip: reportInfo.lipstick_lip ? reportInfo.lipstick_lip : 0,
                    hair_care: reportInfo.hair_care ? reportInfo.hair_care : 0,
                    hand_wash_hand_sanitizer: reportInfo.hand_wash_hand_sanitizer ? reportInfo.hand_wash_hand_sanitizer : 0
                })
                reportDataEleven.push({
                    spagadi_noodles_shemai_soup: reportInfo.spagadi_noodles_shemai_soup ? reportInfo.spagadi_noodles_shemai_soup : 0,
                    stationary: reportInfo.stationary ? reportInfo.stationary : 0,
                    bath_laundry_soap: reportInfo.bath_laundry_soap ? reportInfo.bath_laundry_soap : 0,
                    dog_food: reportInfo.dog_food ? reportInfo.dog_food : 0,
                    gift_item: reportInfo.gift_item ? reportInfo.gift_item : 0,
                    office_stationary: reportInfo.office_stationary ? reportInfo.office_stationary : 0,
                    nail_care: reportInfo.nail_care ? reportInfo.nail_care : 0,
                    birds_other: reportInfo.birds_other ? reportInfo.birds_other : 0,
                    bed_sheet_others: reportInfo.bed_sheet_others ? reportInfo.bed_sheet_others : 0,
                    dry_fish: reportInfo.dry_fish ? reportInfo.dry_fish : 0,
                    soup_spoon: reportInfo.soup_spoon ? reportInfo.soup_spoon : 0,
                    face_wash: reportInfo.face_wash ? reportInfo.face_wash : 0

                })
                reportDataTwelve.push({
                    hand_watch: reportInfo.hand_watch ? reportInfo.hand_watch : 0,
                    shoes: reportInfo.shoes ? reportInfo.shoes : 0,
                    mobile_accessories: reportInfo.mobile_accessories ? reportInfo.mobile_accessories : 0,
                    baby_food: reportInfo.baby_food ? reportInfo.baby_food : 0,
                    perfume_bodysppary_roleone: reportInfo.perfume_bodysppary_roleone ? reportInfo.perfume_bodysppary_roleone : 0,
                    energy_drinks: reportInfo.energy_drinks ? reportInfo.energy_drinks : 0,
                    lassi_milk_milk_shake: reportInfo.lassi_milk_milk_shake ? reportInfo.lassi_milk_milk_shake : 0,
                    shaving_items: reportInfo.shaving_items ? reportInfo.shaving_items : 0,
                    oral_care: reportInfo.oral_care ? reportInfo.oral_care : 0,
                    roys: reportInfo.roys ? reportInfo.roys : 0,
                    party_popper: reportInfo.party_popper ? reportInfo.party_popper : 0,
                    frozen_items: reportInfo.frozen_items ? reportInfo.frozen_items : 0

                })
                reportDataThirteen.push({
                    socks: reportInfo.socks ? reportInfo.socks : 0,
                    perfume_bodyspray: reportInfo.perfume_bodyspray ? reportInfo.perfume_bodyspray : 0,
                    chocolate_wafer_marsh_low_chips: reportInfo.chocolate_wafer_marsh_low_chips ? reportInfo.chocolate_wafer_marsh_low_chips : 0,
                    total: reportInfo.total
                })
            })

            finalReportData.push({
                reportDataOne: reportDataOne
            })
            finalReportData.push({
                reportDataTwo: reportDataTwo
            })
            finalReportData.push({
                reportDataThree: reportDataThree
            })
            finalReportData.push({
                reportDataFour: reportDataFour
            })
            finalReportData.push({
                reportDataFive: reportDataFive
            })
            finalReportData.push({
                reportDataSix: reportDataSix
            })
            finalReportData.push({
                reportDataSeven: reportDataSeven
            })
            finalReportData.push({
                reportDataEight: reportDataEight
            })
            finalReportData.push({
                reportDataNine: reportDataNine
            })
            finalReportData.push({
                reportDataTen: reportDataTen
            })
            finalReportData.push({
                reportDataEleven: reportDataEleven
            })
            finalReportData.push({
                reportDataTwelve: reportDataTwelve
            })
            finalReportData.push({
                reportDataThirteen: reportDataThirteen
            })
        }

        process.send({
            finalReportData,
            grandTotal,
            grandCustomerTotal
        });
    }

});


















